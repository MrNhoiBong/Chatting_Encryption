import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { chatApi } from './api';
import { Shield, User, Send, Settings, Search, MoreVertical, Paperclip, Smile, LogOut, ChevronRight, Zap, Plus, Users, UserPlus, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState({ ip: 'host.docker.internal', port: 5000 });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [ignoredInvites, setIgnoredInvites] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isInvitingToGroup, setIsInvitingToGroup] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser]);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await chatApi.checkStatus();
        if (status.connected) {
          setCurrentUser(status.username);
          setConnectionInfo({ ip: status.server_ip, port: status.server_port });
        }
      } catch (err) {
        console.error("Failed to check initial connection status", err);
      }
    };
    checkConnection();
  }, []);

  // Polling for users and messages
  useEffect(() => {
    if (!currentUser) return;

    const poll = async () => {
      try {
        const usersResp = await chatApi.getUsers();
        setOnlineUsers(usersResp.users.filter(u => u !== currentUser));

        const msgsResp = await chatApi.getMessages();
        if (msgsResp.messages && msgsResp.messages.length > 0) {
          const sysMsgs = msgsResp.messages.filter(m => m.is_system);
          const normalMsgs = msgsResp.messages.filter(m => !m.is_system);
          
          if (sysMsgs.length > 0) {
            setSystemNotifications(prev => [...prev, ...sysMsgs.map(m => m.message)]);
            sysMsgs.forEach(() => {
              setTimeout(() => {
                setSystemNotifications(prev => prev.slice(1));
              }, 5000);
            });
          }

          if (normalMsgs.length > 0) {
            setMessages(prev => [...prev, ...normalMsgs.map(m => ({ ...m, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))]);
          }
        }

        const groupInfoResp = await chatApi.getGroupInfo();
        if (groupInfoResp.joined_groups) {
          setJoinedGroups(groupInfoResp.joined_groups);
        }
        if (groupInfoResp.pending_invitations) {
          setPendingInvitations(groupInfoResp.pending_invitations);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(poll, 2000);
    poll(); // Initial call
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleConnect = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const ip = e.target.ip.value;
    const port = e.target.port.value;

    if (!username) return;

    setIsConnecting(true);
    setError(null);
    try {
      await chatApi.connect(username, ip, port);
      setCurrentUser(username);
      setConnectionInfo({ ip, port });
    } catch (err) {
      setError("Failed to connect to backend server.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const msgText = newMessage;
    setNewMessage('');
    
    try {
      if (isGroupChat) {
        await chatApi.sendGroupMessage(selectedUser, msgText);
        setMessages(prev => [...prev, {
          sender: currentUser,
          receiver: selectedUser,
          is_group: true,
          message: msgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        await chatApi.sendMessage(selectedUser, msgText);
        setMessages(prev => [...prev, {
          sender: currentUser,
          receiver: selectedUser,
          is_group: false,
          message: msgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error("Failed to send:", err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await chatApi.createGroup(newGroupName);
      setSelectedUser(newGroupName);
      setIsGroupChat(true);
      setIsCreatingGroup(false);
      setNewGroupName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteToGroup = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !selectedUser || !isGroupChat) return;
    try {
      await chatApi.inviteToGroup(selectedUser, inviteUsername);
      setIsInvitingToGroup(false);
      setInviteUsername('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a] text-[#f1f5f9]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[480px] flex flex-col items-center"
        >
          <header className="mb-10 text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-[#4f46e5]/20 blur-3xl rounded-full"></div>
              <div className="relative bg-slate-900 border border-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl">
                <Shield className="text-[#4f46e5] w-10 h-10 fill-[#4f46e5]/20" />
              </div>
            </div>
            <h1 className="font-headline text-4xl text-white tracking-tight mb-2 uppercase font-bold">SecureChat</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.25em] font-mono">Encrypted Node Access</p>
          </header>

          <main className="w-full bg-[#1e293b]/70 border border-white/5 rounded-2xl p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#4f46e5]/5 blur-[80px] -mr-24 -mt-24 pointer-events-none"></div>
            
            <form onSubmit={handleConnect} className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Server IP Address</label>
                <input 
                  name="ip"
                  defaultValue="host.docker.internal"
                  className="w-full bg-slate-950/40 border border-slate-800 focus:border-[#4f46e5]/50 focus:ring-1 focus:ring-[#4f46e5]/50 rounded-xl py-4 px-5 text-white outline-none transition-all"
                  placeholder="e.g. 192.168.1.1"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-3">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Port</label>
                  <input 
                    name="port"
                    defaultValue="5000"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-[#4f46e5]/50 focus:ring-1 focus:ring-[#4f46e5]/50 rounded-xl py-4 px-5 text-white outline-none transition-all"
                    placeholder="5000"
                  />
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Username</label>
                  <input 
                    name="username"
                    required
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-[#4f46e5]/50 focus:ring-1 focus:ring-[#4f46e5]/50 rounded-xl py-4 px-5 text-white outline-none transition-all"
                    placeholder="Enter identifier"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

              <button 
                type="submit"
                disabled={isConnecting}
                className="w-full py-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-xl shadow-lg shadow-[#4f46e5]/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isConnecting ? "AUTHORIZING..." : (
                  <>
                    ESTABLISH CONNECTION <Shield className="w-4 h-4 fill-current" />
                  </>
                )}
              </button>
            </form>
          </main>


          <footer className="mt-10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(78,222,163,0.4)]"></span>
              IBE Encryption Active
            </div>
            <p className="text-slate-600 text-[11px] max-w-[320px] text-center leading-relaxed opacity-60 uppercase tracking-widest">
              v4.0.2 • Peer-to-peer verification active
            </p>
          </footer>
        </motion.div>
      </div>
    );
  }

  const currentChatMessages = messages.filter(m => 
    isGroupChat 
      ? (m.is_group && m.receiver === selectedUser)
      : (!m.is_group && ((m.sender === selectedUser && m.receiver === currentUser) || (m.sender === currentUser && m.receiver === selectedUser)))
  );

  return (
    <div className="flex h-screen bg-[#0f172a] text-[#f1f5f9] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-sidebar-width glass-panel border-r border-slate-800 flex flex-col h-full flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5] flex items-center justify-center shadow-lg shadow-[#4f46e5]/20">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">SECURE CHAT</span>
              <span className="text-[10px] text-slate-400 font-mono">v4.0.2-STABLE</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Node Identity</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Connected</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase italic">
                {currentUser[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{currentUser}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{connectionInfo.ip}:{connectionInfo.port}</p>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto space-y-1">
            <div className="flex items-center justify-between px-2 mb-2 mt-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Groups</h3>
              <button onClick={() => setIsCreatingGroup(true)} className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-800 rounded-md">
                 <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1 mb-4">
              {joinedGroups.map(group => (
                <button 
                  key={group}
                  onClick={() => { setSelectedUser(group); setIsGroupChat(true); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                    selectedUser === group && isGroupChat
                      ? 'bg-[#4f46e5]/10 border border-[#4f46e5]/20' 
                      : 'hover:bg-slate-800/50 opacity-80'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center font-bold text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${selectedUser === group && isGroupChat ? 'text-white' : 'text-slate-300'}`}>{group}</p>
                    <p className="text-[10px] text-slate-500">Group Chat</p>
                  </div>
                </button>
              ))}
              {joinedGroups.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">No groups</p>
                </div>
              )}
            </div>

            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2 mb-2">Online Nodes</h3>
            <div className="space-y-1">
              {onlineUsers.map(user => (
                <button 
                  key={user}
                  onClick={() => { setSelectedUser(user); setIsGroupChat(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                    selectedUser === user && !isGroupChat
                      ? 'bg-[#4f46e5]/10 border border-[#4f46e5]/20' 
                      : 'hover:bg-slate-800/50 opacity-80'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                      {user[0].toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${selectedUser === user && !isGroupChat ? 'text-white' : 'text-slate-300'}`}>{user}</p>
                    <p className="text-[10px] text-slate-500">Active now</p>
                  </div>
                </button>
              ))}
              {onlineUsers.length === 0 && (
                <div className="px-3 py-10 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Scanning for nodes...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>POLLING: 2000MS</span>
            <span>PKI-LESS</span>
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        {selectedUser ? (
          <>
            <header className="h-20 flex-shrink-0 border-b border-slate-900 flex items-center justify-between px-8 z-10">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${isGroupChat ? 'bg-indigo-900/50 text-indigo-400' : 'bg-[#4f46e5]/20 text-[#4f46e5]'} flex items-center justify-center font-bold`}>
                  {isGroupChat ? <Users className="w-5 h-5" /> : selectedUser[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{isGroupChat ? selectedUser : `Chat with ${selectedUser}`}</h2>
                  <p className="text-xs text-emerald-400 font-medium">Encrypted with Identity: {selectedUser}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGroupChat && (
                  <button onClick={() => setIsInvitingToGroup(true)} className="p-2 text-slate-400 hover:bg-slate-800 transition-colors rounded-xl" title="Invite User">
                    <UserPlus className="w-5 h-5" />
                  </button>
                )}
                <button className="p-2 text-slate-400 hover:bg-slate-800 transition-colors rounded-xl">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:bg-slate-800 transition-colors rounded-xl">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth custom-scrollbar">
              <div className="flex justify-center mb-8">
                <span className="bg-slate-900 text-slate-500 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold">Secure Channel Established</span>
              </div>

              {currentChatMessages.map((msg, idx) => {
                const isMine = msg.sender === currentUser;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={idx} 
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-2`}
                  >
                    <div className={`max-w-[70%] px-5 py-4 rounded-2xl shadow-lg ${
                      isMine 
                        ? 'bg-[#4f46e5] text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono px-1 uppercase tracking-tight">
                      {msg.timestamp} • {isMine ? 'Sent' : 'Received'}
                    </span>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-8 bg-slate-950">
              <div className="max-w-5xl mx-auto">
                <form onSubmit={handleSendMessage} className="glass-panel rounded-2xl p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#4f46e5]/50 transition-all transition-all">
                  <button type="button" className="p-3 text-slate-400 hover:text-white transition-colors">
                    <Paperclip className="w-6 h-6" />
                  </button>
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white px-2 placeholder-slate-500"
                    placeholder="Type an encrypted message..."
                  />
                  <button 
                    type="submit"
                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>Send</span>
                    <Send className="w-4 h-4 fill-current" />
                  </button>
                </form>
                <p className="text-center mt-4 text-[10px] text-slate-600">
                  All messages are automatically encrypted via IBE Client API before transmission.
                </p>
              </div>
            </footer>
          </>

        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
              <Zap className="text-slate-700 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-300 mb-2 font-headline">Select a contact</h2>
            <p className="text-slate-500 max-w-sm mb-8">Choose an active user from the sidebar to begin a secure end-to-end encrypted conversation.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {onlineUsers.map(user => (
                <button 
                  key={user}
                  onClick={() => { setSelectedUser(user); setIsGroupChat(false); }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition-all flex items-center gap-2 group"
                >
                  <User className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">{user}</span>
                  <ChevronRight className="w-3 h-3 text-slate-700 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Group Invitation Popups */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {pendingInvitations.filter(inv => !ignoredInvites.includes(inv.group_name)).map((inv) => (
            <motion.div
              key={`inv-${inv.group_name}`}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3 w-80 pointer-events-auto"
            >
              <p className="text-sm text-white">
                <strong className="text-emerald-400">{inv.inviter}</strong> mời bạn tham gia <strong>{inv.group_name}</strong>
              </p>
              <div className="flex gap-2 justify-end mt-2">
                <button 
                  onClick={() => setIgnoredInvites(prev => [...prev, inv.group_name])}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  Không
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await chatApi.acceptGroupInvite(inv.group_name);
                      setIgnoredInvites(prev => [...prev, inv.group_name]);
                      setSelectedUser(inv.group_name);
                      setIsGroupChat(true);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] transition-colors"
                >
                  Đồng ý
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* System Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {systemNotifications.map((msg, idx) => (
            <motion.div
              key={`sys-${idx}-${msg}`}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className="bg-red-900/90 border border-red-700 p-4 rounded-xl shadow-2xl flex items-center gap-3 w-80 pointer-events-auto"
            >
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{msg}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreatingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 max-w-[90%]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Create Group</h3>
                <button onClick={() => setIsCreatingGroup(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateGroup}>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Group Name" 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 focus:border-[#4f46e5]/50 focus:ring-1 focus:ring-[#4f46e5]/50 rounded-xl py-3 px-4 text-white outline-none transition-all mb-4"
                />
                <button type="submit" className="w-full py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-xl shadow-lg transition-all">
                  Create
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite to Group Modal */}
      <AnimatePresence>
        {isInvitingToGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 max-w-[90%]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Invite to {selectedUser}</h3>
                <button onClick={() => setIsInvitingToGroup(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleInviteToGroup}>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Username to invite" 
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 focus:border-[#4f46e5]/50 focus:ring-1 focus:ring-[#4f46e5]/50 rounded-xl py-3 px-4 text-white outline-none transition-all mb-4"
                />
                <button type="submit" className="w-full py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-xl shadow-lg transition-all">
                  Send Invite
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
