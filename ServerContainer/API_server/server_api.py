import socket
import threading
import json
import base64
from charm.toolbox.pairinggroup import PairingGroup, GT
from charm.schemes.ibenc.ibenc_bf01 import IBE_BonehFranklin
from charm.core.engine.util import objectToBytes

class RealTimeSocketServer:
    def __init__(self, host='0.0.0.0', port=5000):
        self.host = host
        self.port = port
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.clients = {}  # {username: socket_connection}
        self.lock = threading.Lock()
        
        # Identity-Based Encryption Setup (PKG)
        print("[*] Đang khởi tạo hệ thống IBE (Boneh-Franklin)...")
        self.group = PairingGroup('SS512')
        self.ibe = IBE_BonehFranklin(self.group)
        self.mpk, self.msk = self.ibe.setup()
        print("[+] Hệ thống PKG IBE Server đã sẵn sàng.")

    def start(self):
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen()
        print(f"[*] Server API đang chạy ở chế độ TCP Socket tại {self.host}:{self.port}")

        try:
            while True:
                client_socket, address = self.server_socket.accept()
                print(f"[+] Có kết nối mới từ {address}")
                thread = threading.Thread(target=self.handle_client, args=(client_socket, address))
                thread.daemon = True
                thread.start()
        except KeyboardInterrupt:
            print("[*] Server đang tắt...")
        finally:
            self.server_socket.close()

    def handle_client(self, client_socket, address):
        username = None
        try:
            buffer = ""
            while True:
                data = client_socket.recv(8192).decode('utf-8')
                if not data:
                    return
                # Gói nối chuỗi do socket gửi chung chunk (nếu có)
                buffer += data
                while buffer:
                    buffer = buffer.lstrip()
                    if not buffer:
                        break
                    try:
                        msg_json, idx = json.JSONDecoder().raw_decode(buffer)
                        buffer = buffer[idx:]
                        
                        # Xử lý Logic
                        if msg_json.get("type") == "register":
                            requested_name = msg_json.get("username")
                            with self.lock:
                                if requested_name in self.clients:
                                    client_socket.send(json.dumps({"status": "error", "message": "Tên đã có người dùng."}).encode('utf-8'))
                                    return
                                
                                self.clients[requested_name] = client_socket
                                username = requested_name
                                
                            print(f"[*] Cấp phát IBE Private Key (SK) cho User: {username}")
                            sk = self.ibe.extract(self.msk, username)
                            
                            mpk_bytes = objectToBytes(self.mpk, self.group)
                            sk_bytes = objectToBytes(sk, self.group)
                            
                            response = {
                                "status": "success",
                                "mpk": base64.b64encode(mpk_bytes).decode('utf-8'),
                                "sk": base64.b64encode(sk_bytes).decode('utf-8'),
                                "users": list(self.clients.keys())
                            }
                            # Send configuration to client
                            client_socket.send(json.dumps(response).encode('utf-8'))
                            self.broadcast_user_list()
                            
                        elif msg_json.get("type") == "message":
                            receiver = msg_json.get("receiver")
                            self.forward_message(username, receiver, msg_json)
                            
                        elif msg_json.get("type") == "request_users":
                            self.send_user_list(username)
                            
                    except json.JSONDecodeError:
                        break # Cần chờ thêm data
                        
        except Exception as e:
            print(f"[-] Lỗi dòng kết nối từ {username or address}: {e}")
        finally:
            if username:
                with self.lock:
                    if username in self.clients:
                        del self.clients[username]
                self.broadcast_user_list()
            client_socket.close()
            print(f"[*] Ngắt kết nối từ {username or address}.")

    def forward_message(self, sender, receiver, payload_json):
        """ Chuyển tiếp ngay lập tức thông qua mảng Socket. """
        with self.lock:
            if receiver in self.clients:
                receiver_sock = self.clients[receiver]
                payload_json["sender"] = sender
                try:
                    receiver_sock.send(json.dumps(payload_json).encode('utf-8'))
                except Exception as e:
                    print(f"[-] Lỗi chuyển tiếp đến {receiver}: {e}")
            else:
                # Nếu người nhận không có liên kết, báo lỗi lại cho người gửi
                if sender in self.clients:
                    sender_sock = self.clients[sender]
                    err_msg = {"type": "system", "content": f"Chuyển tiếp thất bại: Người dùng '{receiver}' không online."}
                    try:
                        sender_sock.send(json.dumps(err_msg).encode('utf-8'))
                    except:
                        pass

    def send_user_list(self, requester):
        with self.lock:
            if requester in self.clients:
                users = list(self.clients.keys())
                msg = {"type": "user_list", "users": users}
                try:
                    self.clients[requester].send(json.dumps(msg).encode('utf-8'))
                except:
                    pass

    def broadcast_user_list(self):
        with self.lock:
            users = list(self.clients.keys())
            msg = {"type": "user_list", "users": users}
            msg_str = json.dumps(msg).encode('utf-8')
            for user, sock in self.clients.items():
                try:
                    sock.send(msg_str)
                except:
                    pass

if __name__ == "__main__":
    server = RealTimeSocketServer(host='0.0.0.0', port=5000)
    server.start()
