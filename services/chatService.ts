import { ChatMessage, ChatParticipant, WarehouseChat, ChatMessageType, ChatCommand, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import debugService from './debugService';
import userService from './userService';
import * as localStorageService from './localStorageService';
import accessControlService from './accessControlService';

class ChatService {
  private chats: Map<string, WarehouseChat> = new Map();
  private commands: Map<string, ChatCommand> = new Map();
  private messageHandlers: Array<(message: ChatMessage) => void> = [];

  constructor() {
    this.initializeCommands();
    this.loadChats();
  }

  private initializeCommands(): void {
    // Register built-in chat commands
    this.registerCommand({
      command: 'find',
      description: 'Find items in warehouse',
      usage: '/find <item name>',
      requiredRole: 'guest',
      handler: this.handleFindCommand.bind(this)
    });

    this.registerCommand({
      command: 'add',
      description: 'Quick add item to warehouse',
      usage: '/add <item name> [quantity] [location]',
      requiredRole: 'editor',
      handler: this.handleAddCommand.bind(this)
    });

    this.registerCommand({
      command: 'status',
      description: 'Show warehouse status',
      usage: '/status',
      requiredRole: 'viewer',
      handler: this.handleStatusCommand.bind(this)
    });

    this.registerCommand({
      command: 'help',
      description: 'Show available commands',
      usage: '/help',
      requiredRole: 'guest',
      handler: this.handleHelpCommand.bind(this)
    });

    this.registerCommand({
      command: 'invite',
      description: 'Generate invite link for private warehouse',
      usage: '/invite',
      requiredRole: 'master',
      handler: this.handleInviteCommand.bind(this)
    });
  }

  registerCommand(command: ChatCommand): void {
    this.commands.set(command.command, command);
  }

  // Initialize or get chat for warehouse
  getOrCreateChat(warehouseId: string): WarehouseChat {
    if (!this.chats.has(warehouseId)) {
      const newChat: WarehouseChat = {
        warehouseId,
        participants: [],
        messages: [],
        lastActivity: new Date(),
        settings: {
          allowPhotos: true,
          allowCommands: true,
          allowItemSharing: true,
          autoActions: true
        }
      };
      this.chats.set(warehouseId, newChat);
      this.saveChats();
    }
    return this.chats.get(warehouseId)!;
  }

  // Send message to warehouse chat
  async sendMessage(
    warehouseId: string, 
    content: string, 
    type: ChatMessageType = 'text',
    attachment?: any
  ): Promise<ChatMessage> {
    const currentUser = userService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const chat = this.getOrCreateChat(warehouseId);
    
    // Check if user has permission to send messages
    const warehouse = localStorageService.getWarehouses().find(w => w.id === warehouseId);
    if (warehouse && !accessControlService.hasPermission(warehouse, 'view', currentUser.id)) {
      throw new Error('No permission to send messages in this warehouse');
    }

    // Handle commands
    if (content.startsWith('/') && type === 'text') {
      return await this.handleCommand(warehouseId, content, currentUser.id);
    }

    const message: ChatMessage = {
      id: uuidv4(),
      warehouseId,
      senderId: currentUser.id,
      senderName: currentUser.username,
      type,
      content,
      timestamp: new Date(),
      isRead: false,
      attachment
    };

    chat.messages.push(message);
    chat.lastActivity = new Date();
    
    // Ensure sender is in participants
    this.ensureParticipant(chat, currentUser.id, currentUser.username);

    this.saveChats();
    this.notifyMessageHandlers(message);

    debugService.info('ChatService: Message sent', {
      warehouseId,
      type,
      contentLength: content.length
    });

    return message;
  }

  // Handle chat commands
  private async handleCommand(warehouseId: string, commandText: string, senderId: string): Promise<ChatMessage> {
    const [commandName, ...args] = commandText.slice(1).split(' ');
    const command = this.commands.get(commandName.toLowerCase());

    if (!command) {
      return this.createSystemMessage(
        warehouseId,
        `Unknown command: /${commandName}. Type /help for available commands.`,
        'command'
      );
    }

    // Check permissions
    const warehouse = localStorageService.getWarehouses().find(w => w.id === warehouseId);
    if (warehouse) {
      const userRole = accessControlService.getUserRole(warehouse, senderId);
      if (!userRole || !this.hasCommandPermission(userRole, command.requiredRole)) {
        return this.createSystemMessage(
          warehouseId,
          `Permission denied. Required role: ${command.requiredRole}`,
          'command'
        );
      }
    }

    try {
      const result = await command.handler(args, senderId, warehouseId);
      return result || this.createSystemMessage(warehouseId, 'Command executed successfully', 'command');
    } catch (error) {
      debugService.error('ChatService: Command error', error);
      return this.createSystemMessage(
        warehouseId,
        `Command error: ${(error as Error).message}`,
        'command'
      );
    }
  }

  private hasCommandPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = { guest: 0, viewer: 1, editor: 2, master: 3 };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  private createSystemMessage(warehouseId: string, content: string, type: ChatMessageType): ChatMessage {
    return {
      id: uuidv4(),
      warehouseId,
      senderId: 'system',
      senderName: 'System',
      type,
      content,
      timestamp: new Date(),
      isRead: false
    };
  }

  // Command handlers
  private async handleFindCommand(args: string[], senderId: string, warehouseId: string): Promise<ChatMessage | null> {
    if (args.length === 0) {
      return this.createSystemMessage(warehouseId, 'Usage: /find <item name>', 'command');
    }

    const searchTerm = args.join(' ');
    const results = localStorageService.findItemsByName(searchTerm);
    
    // Filter results to current warehouse
    const warehouseResults = results.filter(item => item.path.startsWith(warehouseId));

    if (warehouseResults.length === 0) {
      return this.createSystemMessage(warehouseId, `No items found matching "${searchTerm}"`, 'command');
    }

    const resultText = warehouseResults
      .map(item => `📦 ${item.name} (${item.quantity}${item.unit || ''}) - ${item.path}`)
      .join('\n');

    return this.createSystemMessage(
      warehouseId,
      `Found ${warehouseResults.length} item(s):\n${resultText}`,
      'command'
    );
  }

  private async handleAddCommand(args: string[], senderId: string, warehouseId: string): Promise<ChatMessage | null> {
    if (args.length === 0) {
      return this.createSystemMessage(warehouseId, 'Usage: /add <item name> [quantity] [location]', 'command');
    }

    const itemName = args[0];
    const quantity = args[1] ? parseInt(args[1]) : 1;
    const location = args.slice(2).join(' ') || 'General';

    try {
      // This is a simplified add - in real implementation we'd need to specify exact location
      const warehouse = localStorageService.getWarehouses().find(w => w.id === warehouseId);
      if (!warehouse || !warehouse.rooms || warehouse.rooms.length === 0) {
        return this.createSystemMessage(warehouseId, 'No available locations in warehouse', 'command');
      }

      // Find or create a default room/shelf
      const defaultRoom = warehouse.rooms[0];
      const defaultShelf = defaultRoom.shelves?.[0];

      if (!defaultShelf) {
        return this.createSystemMessage(warehouseId, 'No available containers in warehouse', 'command');
      }

      // Add item
      localStorageService.addItem(warehouseId, defaultRoom.id, defaultShelf.id, {
        name: itemName,
        quantity,
        priority: 'Normal',
        unit: 'pcs'
      });

      // Create action message
      return {
        id: uuidv4(),
        warehouseId,
        senderId,
        senderName: userService.getCurrentUser()?.username || 'Unknown',
        type: 'action',
        content: `Added ${quantity} ${itemName} to ${defaultShelf.name}`,
        timestamp: new Date(),
        isRead: false,
        action: {
          type: 'item_added',
          details: `${itemName} (${quantity})`,
          targetId: defaultShelf.id
        }
      };
    } catch (error) {
      return this.createSystemMessage(warehouseId, `Failed to add item: ${(error as Error).message}`, 'command');
    }
  }

  private async handleStatusCommand(args: string[], senderId: string, warehouseId: string): Promise<ChatMessage | null> {
    const warehouse = localStorageService.getWarehouses().find(w => w.id === warehouseId);
    if (!warehouse) {
      return this.createSystemMessage(warehouseId, 'Warehouse not found', 'command');
    }

    const totalItems = warehouse.rooms?.reduce((total, room) => {
      return total + (room.shelves?.reduce((roomTotal, shelf) => {
        return roomTotal + (shelf.items?.length || 0);
      }, 0) || 0);
    }, 0) || 0;

    const totalRooms = warehouse.rooms?.length || 0;
    const totalShelves = warehouse.rooms?.reduce((total, room) => {
      return total + (room.shelves?.length || 0);
    }, 0) || 0;

    const chat = this.getOrCreateChat(warehouseId);
    const onlineUsers = chat.participants.filter(p => p.isOnline).length;

    const statusText = `📊 Warehouse Status:
📦 Items: ${totalItems}
🏠 Rooms: ${totalRooms}  
📋 Containers: ${totalShelves}
👥 Online: ${onlineUsers}/${chat.participants.length}`;

    return this.createSystemMessage(warehouseId, statusText, 'command');
  }

  private async handleHelpCommand(args: string[], senderId: string, warehouseId: string): Promise<ChatMessage | null> {
    const warehouse = localStorageService.getWarehouses().find(w => w.id === warehouseId);
    const userRole = warehouse ? accessControlService.getUserRole(warehouse, senderId) : 'guest';

    const availableCommands = Array.from(this.commands.values())
      .filter(cmd => userRole && this.hasCommandPermission(userRole, cmd.requiredRole))
      .map(cmd => `${cmd.usage} - ${cmd.description}`)
      .join('\n');

    return this.createSystemMessage(
      warehouseId,
      `Available commands:\n${availableCommands}`,
      'command'
    );
  }

  private async handleInviteCommand(args: string[], senderId: string, warehouseId: string): Promise<ChatMessage | null> {
    const warehouse = localStorageService.getWarehouses().find(w => w.id === warehouseId);
    if (!warehouse) {
      return this.createSystemMessage(warehouseId, 'Warehouse not found', 'command');
    }

    if (warehouse.accessControl.accessLevel !== 'private') {
      return this.createSystemMessage(warehouseId, 'Warehouse is public - no invite needed', 'command');
    }

    const inviteCode = warehouse.accessControl.inviteCode;
    if (!inviteCode) {
      return this.createSystemMessage(warehouseId, 'No invite code available', 'command');
    }

    return this.createSystemMessage(
      warehouseId,
      `🔑 Invite code for ${warehouse.name}: ${inviteCode}\nShare this code with others to grant access.`,
      'invite'
    );
  }

  // Share item in chat
  async shareItem(warehouseId: string, itemId: string, location: string): Promise<ChatMessage> {
    const warehouses = localStorageService.getWarehouses();
    let foundItem: any = null;
    
    // Find the item
    for (const warehouse of warehouses) {
      if (warehouse.id !== warehouseId) continue;
      for (const room of warehouse.rooms || []) {
        for (const shelf of room.shelves || []) {
          foundItem = shelf.items?.find(item => item.id === itemId);
          if (foundItem) break;
        }
        if (foundItem) break;
      }
      if (foundItem) break;
    }

    if (!foundItem) {
      throw new Error('Item not found');
    }

    return await this.sendMessage(warehouseId, `Shared item: ${foundItem.name}`, 'item_share', {
      type: 'item',
      data: JSON.stringify(foundItem)
    });
  }

  // Send action message (system generated)
  async sendActionMessage(
    warehouseId: string, 
    actionType: 'item_added' | 'item_moved' | 'item_deleted' | 'user_joined',
    details: string,
    targetId?: string
  ): Promise<void> {
    const chat = this.getOrCreateChat(warehouseId);
    
    // Only send if auto-actions are enabled
    if (!chat.settings.autoActions) return;

    const currentUser = userService.getCurrentUser();
    const message: ChatMessage = {
      id: uuidv4(),
      warehouseId,
      senderId: currentUser?.id || 'system',
      senderName: currentUser?.username || 'System',
      type: 'action',
      content: details,
      timestamp: new Date(),
      isRead: false,
      action: {
        type: actionType,
        details,
        targetId
      }
    };

    chat.messages.push(message);
    chat.lastActivity = new Date();
    this.saveChats();
    this.notifyMessageHandlers(message);
  }

  // Get chat messages
  getMessages(warehouseId: string, limit: number = 50): ChatMessage[] {
    const chat = this.chats.get(warehouseId);
    if (!chat) return [];
    
    return chat.messages
      .slice(-limit)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Add participant to chat
  private ensureParticipant(chat: WarehouseChat, userId: string, userName: string): void {
    const existing = chat.participants.find(p => p.userId === userId);
    if (existing) {
      existing.lastSeen = new Date();
      existing.isOnline = true;
      return;
    }

    // Get user role from warehouse
    const warehouse = localStorageService.getWarehouses().find(w => w.id === chat.warehouseId);
    const role = warehouse ? accessControlService.getUserRole(warehouse, userId) || 'guest' : 'guest';

    const participant: ChatParticipant = {
      userId,
      userName,
      role,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isOnline: true
    };

    chat.participants.push(participant);
  }

  // Mark messages as read
  markAsRead(warehouseId: string, userId: string): void {
    const chat = this.chats.get(warehouseId);
    if (!chat) return;

    chat.messages.forEach(msg => {
      if (msg.senderId !== userId) {
        msg.isRead = true;
      }
    });

    this.saveChats();
  }

  // Get unread count
  getUnreadCount(warehouseId: string, userId: string): number {
    const chat = this.chats.get(warehouseId);
    if (!chat) return 0;

    return chat.messages.filter(msg => 
      msg.senderId !== userId && !msg.isRead
    ).length;
  }

  // Event handling
  onMessage(handler: (message: ChatMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  private notifyMessageHandlers(message: ChatMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        debugService.error('ChatService: Message handler error', error);
      }
    });
  }

  // Persistence
  private saveChats(): void {
    try {
      const chatData = Array.from(this.chats.entries()).map(([id, chat]) => [id, {
        ...chat,
        messages: chat.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        })),
        participants: chat.participants.map(p => ({
          ...p,
          joinedAt: p.joinedAt.toISOString(),
          lastSeen: p.lastSeen.toISOString()
        })),
        lastActivity: chat.lastActivity.toISOString()
      }]);
      
      localStorage.setItem('inventory-chats', JSON.stringify(chatData));
    } catch (error) {
      debugService.error('ChatService: Failed to save chats', error);
    }
  }

  private loadChats(): void {
    try {
      const saved = localStorage.getItem('inventory-chats');
      if (!saved) return;

      const chatData = JSON.parse(saved);
      this.chats.clear();

      chatData.forEach(([id, chat]: [string, any]) => {
        this.chats.set(id, {
          ...chat,
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          participants: chat.participants.map((p: any) => ({
            ...p,
            joinedAt: new Date(p.joinedAt),
            lastSeen: new Date(p.lastSeen)
          })),
          lastActivity: new Date(chat.lastActivity)
        });
      });

      debugService.info('ChatService: Loaded chats', { count: this.chats.size });
    } catch (error) {
      debugService.error('ChatService: Failed to load chats', error);
    }
  }

  // Get all chats for user
  getUserChats(userId: string): WarehouseChat[] {
    return Array.from(this.chats.values()).filter(chat =>
      chat.participants.some(p => p.userId === userId)
    );
  }

  // Clean up old messages (keep last 1000 per chat)
  cleanupOldMessages(): void {
    this.chats.forEach(chat => {
      if (chat.messages.length > 1000) {
        chat.messages = chat.messages.slice(-1000);
      }
    });
    this.saveChats();
  }
}

// Singleton instance
const chatService = new ChatService();
export default chatService;