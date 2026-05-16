import json
import base64
import threading
import sys
import os
import socket
from flask import Flask, request, jsonify
from flask_cors import CORS

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from charm.toolbox.pairinggroup import PairingGroup
from charm.schemes.ibenc.ibenc_bf01 import IBE_BonehFranklin
from charm.core.engine.util import bytesToObject, objectToBytes
from charm.core.math.integer import integer

app = Flask(__name__)
CORS(app)

SERVER_IP = None
SERVER_PORT = None
username = None
group = PairingGroup('SS512')
ibe = IBE_BonehFranklin(group)
mpk = None
sk = None
client_socket = None

config_lock = threading.Lock()
local_messages_db = []
active_users = []
local_group_sks = {}
pending_invitations = []
joined_groups = []

def listen_for_messages():
    """ Luồng chạy ngầm để hứng tin nhắn đẩy từ Socket Server về """
    global active_users
    buffer = ""
    while True:
        try:
            data = client_socket.recv(8192).decode('utf-8')
            if not data:
                print("[-] Ngắt kết nối TCP từ Server")
                break
                
            buffer += data
            while buffer:
                buffer = buffer.lstrip()
                if not buffer:
                    break
                    
                try:
                    msg_json, idx = json.JSONDecoder().raw_decode(buffer)
                    buffer = buffer[idx:]
                except json.JSONDecodeError:
                    break
                
                msg_type = msg_json.get("type")
                if msg_type == "user_list":
                    active_users = msg_json.get("users", [])
                    
                elif msg_type == "system":
                    # Xử lý báo lỗi (vd: gửi nhầm người không online)
                    print(f"[System Webhook] {msg_json.get('content')}")
                    with config_lock:
                        local_messages_db.append({
                            "sender": "System",
                            "receiver": username,
                            "is_group": False,
                            "message": msg_json.get('content'),
                            "is_system": True
                        })
                    
                elif msg_type == "group_created":
                    group_name = msg_json.get("group_name")
                    sk_bytes = base64.b64decode(msg_json.get("sk_group"))
                    with config_lock:
                        local_group_sks[group_name] = bytesToObject(sk_bytes, group)
                        if group_name not in joined_groups:
                            joined_groups.append(group_name)
                        print(f"[+] Đã tạo và tham gia group: {group_name}")

                elif msg_type == "group_invitation":
                    group_name = msg_json.get("group_name")
                    inviter = msg_json.get("inviter")
                    with config_lock:
                        pending_invitations.append({"group_name": group_name, "inviter": inviter})
                        print(f"[+] Nhận lời mời vào group {group_name} từ {inviter}")

                elif msg_type == "group_joined":
                    group_name = msg_json.get("group_name")
                    sk_bytes = base64.b64decode(msg_json.get("sk_group"))
                    with config_lock:
                        local_group_sks[group_name] = bytesToObject(sk_bytes, group)
                        if group_name not in joined_groups:
                            joined_groups.append(group_name)
                        # Remove from pending if exists
                        pending_invitations[:] = [inv for inv in pending_invitations if inv["group_name"] != group_name]
                        print(f"[+] Đã tham gia group: {group_name}")

                elif msg_type == "group_message":
                    sender = msg_json.get("sender")
                    group_name = msg_json.get("group_name")
                    ibe_key_dict = msg_json["ibe_enc_key"]
                    aes_nonce = base64.b64decode(msg_json["aes_nonce"])
                    aes_ciphertext = base64.b64decode(msg_json["aes_ciphertext"])
                    aes_tag = base64.b64decode(msg_json["aes_tag"])
                    
                    try:
                        with config_lock:
                            group_sk = local_group_sks.get(group_name)
                        if not group_sk:
                            print(f"[-] Không có secret key cho group {group_name}")
                            continue
                            
                        ibe_ctxt = {}
                        for k, v in ibe_key_dict.items():
                            if v["type"] == "bytes":
                                ibe_ctxt[k] = base64.b64decode(v["data"])
                            elif v["type"] == "integer":
                                ibe_ctxt[k] = integer(int(v["data"]))
                            elif v["type"] == "element":
                                ibe_ctxt[k] = bytesToObject(base64.b64decode(v["data"]), group)
                            else:
                                ibe_ctxt[k] = v["data"]
                                
                        session_key = ibe.decrypt(mpk, group_sk, ibe_ctxt)
                        if session_key:
                            cipher_aes = AES.new(session_key, AES.MODE_EAX, nonce=aes_nonce)
                            plaintext = cipher_aes.decrypt_and_verify(aes_ciphertext, aes_tag)
                            
                            with config_lock:
                                local_messages_db.append({
                                    "sender": sender, 
                                    "receiver": group_name, 
                                    "is_group": True,
                                    "message": plaintext.decode('utf-8')
                                })
                    except Exception as e:
                        print(f"[-] Client_API lỗi khi giải mã group message: {e}")
                    
                elif msg_type == "message":
                    sender = msg_json.get("sender")
                    ibe_key_dict = msg_json["ibe_enc_key"]
                    aes_nonce = base64.b64decode(msg_json["aes_nonce"])
                    aes_ciphertext = base64.b64decode(msg_json["aes_ciphertext"])
                    aes_tag = base64.b64decode(msg_json["aes_tag"])
                    
                    try:
                        ibe_ctxt = {}
                        for k, v in ibe_key_dict.items():
                            if v["type"] == "bytes":
                                ibe_ctxt[k] = base64.b64decode(v["data"])
                            elif v["type"] == "integer":
                                ibe_ctxt[k] = integer(int(v["data"]))
                            elif v["type"] == "element":
                                ibe_ctxt[k] = bytesToObject(base64.b64decode(v["data"]), group)
                            else:
                                ibe_ctxt[k] = v["data"]
                                
                        session_key = ibe.decrypt(mpk, sk, ibe_ctxt)
                        if session_key:
                            cipher_aes = AES.new(session_key, AES.MODE_EAX, nonce=aes_nonce)
                            plaintext = cipher_aes.decrypt_and_verify(aes_ciphertext, aes_tag)
                            
                            with config_lock:
                                local_messages_db.append({
                                    "sender": sender, 
                                    "receiver": username, 
                                    "is_group": False,
                                    "message": plaintext.decode('utf-8')
                                })
                    except Exception as e:
                        print(f"[-] Client_API lỗi khi giải mã luồng sau: {e}")
                        
        except Exception as e:
            print(f"[-] Lỗi thread background socket: {e}")
            break

@app.route('/connect', methods=['POST'])
def connect():
    """
    [POST] /connect
    Mô tả: Mở kết nối TCP Socket 24/7 với PKG Server.
    
    Yêu cầu đầu vào (Request Body JSON):
        - username (String): ID Người dùng.
        - server_ip (String): Địa chỉ IP API_server (Tùy chọn, mặc định "127.0.0.1").
        - server_port (Int): Cổng Socket API_server (Tùy chọn, mặc định 5000).
        * Ví dụ: {"username": "Alice", "server_ip": "127.0.0.1", "server_port": 5000}
    """
    global SERVER_IP, SERVER_PORT, username, mpk, sk, client_socket, active_users
    data = request.json
    if not data or 'username' not in data:
        return jsonify({"error": "Thiếu username"}), 400
        
    user_req = data['username']
    srv_ip = data.get('server_ip', '127.0.0.1')
    srv_port = int(data.get('server_port', 5000))
    
    try:
        if client_socket:
            client_socket.close()

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((srv_ip, srv_port))
        
        reg_msg = {"type": "register", "username": user_req}
        sock.send(json.dumps(reg_msg).encode('utf-8'))
        
        # Đợi lấy cặp MPK/SK
        buffer = ""
        while True:
            chunk = sock.recv(8192).decode('utf-8')
            if not chunk:
                return jsonify({"error": "Server đóng đột ngột"}), 500
            buffer += chunk
            try:
                resp_json, idx = json.JSONDecoder().raw_decode(buffer)
                break
            except json.JSONDecodeError:
                pass
                
        if resp_json.get("status") == "success":
            with config_lock:
                SERVER_IP = srv_ip
                SERVER_PORT = srv_port
                username = user_req
                client_socket = sock
                mpk_bytes = base64.b64decode(resp_json["mpk"])
                sk_bytes = base64.b64decode(resp_json["sk"])
                mpk = bytesToObject(mpk_bytes, group)
                sk = bytesToObject(sk_bytes, group)
                active_users = resp_json.get("users", [])
                
            # Khởi động thread nghe Socket đẩy TCP
            listener = threading.Thread(target=listen_for_messages)
            listener.daemon = True
            listener.start()
                
            return jsonify({"status": "connected", "users": active_users})
        else:
            return jsonify({"error": resp_json.get("message")}), 400
    except Exception as e:
        return jsonify({"error": f"Lỗi mở Socket TCP: {str(e)}"}), 500

@app.route('/users', methods=['GET'])
def get_users():
    """ Đọc ra danh sách đã cập nhật qua events. """
    return jsonify({"users": active_users})

@app.route('/status', methods=['GET'])
def get_status():
    """ 
    [GET] /status
    Kiểm tra xem Client_API đã được connect với Server chưa, để frontend bypass màn hình đăng nhập.
    """
    with config_lock:
        if username and client_socket:
            return jsonify({
                "connected": True, 
                "username": username,
                "server_ip": SERVER_IP,
                "server_port": SERVER_PORT
            })
        return jsonify({"connected": False})

@app.route('/send', methods=['POST'])
def send_message():
    """
    [POST] /send
    Mã hóa cục bộ và Đẩy thẳng bản mã lên giao thức Socket TCP.
    """
    data = request.json
    if not data or 'target' not in data or 'message' not in data:
        return jsonify({"error": "Thiếu target/message"}), 400
        
    target = data['target']
    message = data['message']
    
    with config_lock:
        if not mpk or not username or not client_socket:
            return jsonify({"error": "Chưa kết nối PKG/Socket"}), 400
            
    # AES
    session_key = get_random_bytes(32)
    cipher_aes = AES.new(session_key, AES.MODE_EAX)
    ciphertext, tag = cipher_aes.encrypt_and_digest(message.encode('utf-8'))
    
    # IBE
    ibe_key_ctxt = ibe.encrypt(mpk, target, session_key)
    
    ibe_key_dict = {}
    for k, v in ibe_key_ctxt.items():
        type_str = str(type(v))
        if isinstance(v, bytes):
            ibe_key_dict[k] = {"type": "bytes", "data": base64.b64encode(v).decode('utf-8')}
        elif 'integer' in type_str:
            ibe_key_dict[k] = {"type": "integer", "data": str(int(v))}
        elif 'pairing' in type_str:
            ibe_key_dict[k] = {"type": "element", "data": base64.b64encode(objectToBytes(v, group)).decode('utf-8')}
        else:
            ibe_key_dict[k] = {"type": "str", "data": str(v)}
                
    payload = {
        "type": "message",
        "receiver": target,
        "aes_nonce": base64.b64encode(cipher_aes.nonce).decode('utf-8'),
        "aes_ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
        "aes_tag": base64.b64encode(tag).decode('utf-8'),
        "ibe_enc_key": ibe_key_dict
    }
    
    # Gửi Payload qua TCP Stream
    try:
        client_socket.send(json.dumps(payload).encode('utf-8'))
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": f"Lỗi tuột Socket: {str(e)}"}), 500

@app.route('/groups/create', methods=['POST'])
def create_group():
    data = request.json
    if not data or 'group_name' not in data:
        return jsonify({"error": "Thiếu group_name"}), 400
    with config_lock:
        if not client_socket:
            return jsonify({"error": "Chưa kết nối Socket"}), 400
    
    payload = {"type": "create_group", "group_name": data['group_name']}
    client_socket.send(json.dumps(payload).encode('utf-8'))
    return jsonify({"status": "request_sent"})

@app.route('/groups/invite', methods=['POST'])
def invite_group():
    data = request.json
    if not data or 'group_name' not in data or 'target_user' not in data:
        return jsonify({"error": "Thiếu group_name hoặc target_user"}), 400
    with config_lock:
        if not client_socket:
            return jsonify({"error": "Chưa kết nối Socket"}), 400
            
    payload = {"type": "invite_group", "group_name": data['group_name'], "target_user": data['target_user']}
    client_socket.send(json.dumps(payload).encode('utf-8'))
    return jsonify({"status": "request_sent"})

@app.route('/groups/accept', methods=['POST'])
def accept_group():
    data = request.json
    if not data or 'group_name' not in data:
        return jsonify({"error": "Thiếu group_name"}), 400
    with config_lock:
        if not client_socket:
            return jsonify({"error": "Chưa kết nối Socket"}), 400
            
    payload = {"type": "join_group", "group_name": data['group_name']}
    client_socket.send(json.dumps(payload).encode('utf-8'))
    return jsonify({"status": "request_sent"})

@app.route('/groups/info', methods=['GET'])
def get_group_info():
    with config_lock:
        return jsonify({
            "joined_groups": joined_groups,
            "pending_invitations": pending_invitations
        })

@app.route('/groups/send', methods=['POST'])
def send_group_message():
    data = request.json
    if not data or 'group_name' not in data or 'message' not in data:
        return jsonify({"error": "Thiếu group_name/message"}), 400
        
    group_name = data['group_name']
    message = data['message']
    
    with config_lock:
        if not mpk or not username or not client_socket:
            return jsonify({"error": "Chưa kết nối PKG/Socket"}), 400
        if group_name not in local_group_sks:
            return jsonify({"error": "Bạn chưa tham gia group này"}), 400
            
    # AES
    session_key = get_random_bytes(32)
    cipher_aes = AES.new(session_key, AES.MODE_EAX)
    ciphertext, tag = cipher_aes.encrypt_and_digest(message.encode('utf-8'))
    
    # IBE - Encrypt for group_name
    ibe_key_ctxt = ibe.encrypt(mpk, group_name, session_key)
    
    ibe_key_dict = {}
    for k, v in ibe_key_ctxt.items():
        type_str = str(type(v))
        if isinstance(v, bytes):
            ibe_key_dict[k] = {"type": "bytes", "data": base64.b64encode(v).decode('utf-8')}
        elif 'integer' in type_str:
            ibe_key_dict[k] = {"type": "integer", "data": str(int(v))}
        elif 'pairing' in type_str:
            ibe_key_dict[k] = {"type": "element", "data": base64.b64encode(objectToBytes(v, group)).decode('utf-8')}
        else:
            ibe_key_dict[k] = {"type": "str", "data": str(v)}
                
    payload = {
        "type": "group_message",
        "group_name": group_name,
        "aes_nonce": base64.b64encode(cipher_aes.nonce).decode('utf-8'),
        "aes_ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
        "aes_tag": base64.b64encode(tag).decode('utf-8'),
        "ibe_enc_key": ibe_key_dict
    }
    
    try:
        client_socket.send(json.dumps(payload).encode('utf-8'))
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": f"Lỗi tuột Socket: {str(e)}"}), 500

@app.route('/messages', methods=['GET'])
def get_messages():
    """ 
    [GET] /messages
    Trích xuất text rõ ràng từ Local Database ảo.
    """
    with config_lock:
        msgs = list(local_messages_db)
        local_messages_db.clear()
        
    return jsonify({"messages": msgs})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, threaded=True)
