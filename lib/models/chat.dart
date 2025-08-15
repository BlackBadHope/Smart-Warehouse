import 'package:json_annotation/json_annotation.dart';
import 'warehouse.dart';

part 'chat.g.dart';

enum ChatMessageType {
  text,
  photo,
  itemShare,
  action,
  request,
  command,
  qrShare,
  invite
}

@JsonSerializable()
class ChatAttachment {
  final String type; // 'image', 'qr', 'item'
  final String data; // base64 for images, item JSON for items
  final String? thumbnail;

  const ChatAttachment({
    required this.type,
    required this.data,
    this.thumbnail,
  });

  factory ChatAttachment.fromJson(Map<String, dynamic> json) => 
      _$ChatAttachmentFromJson(json);
  Map<String, dynamic> toJson() => _$ChatAttachmentToJson(this);
}

@JsonSerializable()
class SharedItem {
  final String itemId;
  final String itemName;
  final String location;
  final int quantity;
  final String? photo;

  const SharedItem({
    required this.itemId,
    required this.itemName,
    required this.location,
    required this.quantity,
    this.photo,
  });

  factory SharedItem.fromJson(Map<String, dynamic> json) => 
      _$SharedItemFromJson(json);
  Map<String, dynamic> toJson() => _$SharedItemToJson(this);
}

@JsonSerializable()
class ChatAction {
  final String type; // 'item_added', 'item_moved', 'item_deleted', 'user_joined'
  final String details;
  final String? targetId;

  const ChatAction({
    required this.type,
    required this.details,
    this.targetId,
  });

  factory ChatAction.fromJson(Map<String, dynamic> json) => 
      _$ChatActionFromJson(json);
  Map<String, dynamic> toJson() => _$ChatActionToJson(this);
}

@JsonSerializable()
class ChatMessage {
  final String id;
  final String warehouseId;
  final String senderId;
  final String senderName;
  final ChatMessageType type;
  final String content;
  final DateTime timestamp;
  final ChatAttachment? attachment;
  final SharedItem? sharedItem;
  final ChatAction? action;
  final bool isRead;
  final Map<String, List<String>>? reactions;

  const ChatMessage({
    required this.id,
    required this.warehouseId,
    required this.senderId,
    required this.senderName,
    required this.type,
    required this.content,
    required this.timestamp,
    this.attachment,
    this.sharedItem,
    this.action,
    required this.isRead,
    this.reactions,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => 
      _$ChatMessageFromJson(json);
  Map<String, dynamic> toJson() => _$ChatMessageToJson(this);
}

@JsonSerializable()
class ChatParticipant {
  final String userId;
  final String userName;
  final UserRole role;
  final DateTime joinedAt;
  final DateTime lastSeen;
  final String? avatar;
  final bool isOnline;

  const ChatParticipant({
    required this.userId,
    required this.userName,
    required this.role,
    required this.joinedAt,
    required this.lastSeen,
    this.avatar,
    required this.isOnline,
  });

  factory ChatParticipant.fromJson(Map<String, dynamic> json) => 
      _$ChatParticipantFromJson(json);
  Map<String, dynamic> toJson() => _$ChatParticipantToJson(this);
}

@JsonSerializable()
class ChatSettings {
  final bool allowPhotos;
  final bool allowCommands;
  final bool allowItemSharing;
  final bool autoActions;

  const ChatSettings({
    required this.allowPhotos,
    required this.allowCommands,
    required this.allowItemSharing,
    required this.autoActions,
  });

  factory ChatSettings.fromJson(Map<String, dynamic> json) => 
      _$ChatSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$ChatSettingsToJson(this);
}

@JsonSerializable()
class WarehouseChat {
  final String warehouseId;
  final List<ChatParticipant> participants;
  final List<ChatMessage> messages;
  final DateTime lastActivity;
  final ChatSettings settings;

  const WarehouseChat({
    required this.warehouseId,
    required this.participants,
    required this.messages,
    required this.lastActivity,
    required this.settings,
  });

  factory WarehouseChat.fromJson(Map<String, dynamic> json) => 
      _$WarehouseChatFromJson(json);
  Map<String, dynamic> toJson() => _$WarehouseChatToJson(this);
}