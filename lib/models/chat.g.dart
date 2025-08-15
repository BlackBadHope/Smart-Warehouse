// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatAttachment _$ChatAttachmentFromJson(Map<String, dynamic> json) =>
    ChatAttachment(
      type: json['type'] as String,
      data: json['data'] as String,
      thumbnail: json['thumbnail'] as String?,
    );

Map<String, dynamic> _$ChatAttachmentToJson(ChatAttachment instance) =>
    <String, dynamic>{
      'type': instance.type,
      'data': instance.data,
      'thumbnail': instance.thumbnail,
    };

SharedItem _$SharedItemFromJson(Map<String, dynamic> json) => SharedItem(
      itemId: json['itemId'] as String,
      itemName: json['itemName'] as String,
      location: json['location'] as String,
      quantity: (json['quantity'] as num).toInt(),
      photo: json['photo'] as String?,
    );

Map<String, dynamic> _$SharedItemToJson(SharedItem instance) =>
    <String, dynamic>{
      'itemId': instance.itemId,
      'itemName': instance.itemName,
      'location': instance.location,
      'quantity': instance.quantity,
      'photo': instance.photo,
    };

ChatAction _$ChatActionFromJson(Map<String, dynamic> json) => ChatAction(
      type: json['type'] as String,
      details: json['details'] as String,
      targetId: json['targetId'] as String?,
    );

Map<String, dynamic> _$ChatActionToJson(ChatAction instance) =>
    <String, dynamic>{
      'type': instance.type,
      'details': instance.details,
      'targetId': instance.targetId,
    };

ChatMessage _$ChatMessageFromJson(Map<String, dynamic> json) => ChatMessage(
      id: json['id'] as String,
      warehouseId: json['warehouseId'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String,
      type: $enumDecode(_$ChatMessageTypeEnumMap, json['type']),
      content: json['content'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      attachment: json['attachment'] == null
          ? null
          : ChatAttachment.fromJson(json['attachment'] as Map<String, dynamic>),
      sharedItem: json['sharedItem'] == null
          ? null
          : SharedItem.fromJson(json['sharedItem'] as Map<String, dynamic>),
      action: json['action'] == null
          ? null
          : ChatAction.fromJson(json['action'] as Map<String, dynamic>),
      isRead: json['isRead'] as bool,
      reactions: (json['reactions'] as Map<String, dynamic>?)?.map(
        (k, e) =>
            MapEntry(k, (e as List<dynamic>).map((e) => e as String).toList()),
      ),
    );

Map<String, dynamic> _$ChatMessageToJson(ChatMessage instance) =>
    <String, dynamic>{
      'id': instance.id,
      'warehouseId': instance.warehouseId,
      'senderId': instance.senderId,
      'senderName': instance.senderName,
      'type': _$ChatMessageTypeEnumMap[instance.type]!,
      'content': instance.content,
      'timestamp': instance.timestamp.toIso8601String(),
      'attachment': instance.attachment,
      'sharedItem': instance.sharedItem,
      'action': instance.action,
      'isRead': instance.isRead,
      'reactions': instance.reactions,
    };

const _$ChatMessageTypeEnumMap = {
  ChatMessageType.text: 'text',
  ChatMessageType.photo: 'photo',
  ChatMessageType.itemShare: 'itemShare',
  ChatMessageType.action: 'action',
  ChatMessageType.request: 'request',
  ChatMessageType.command: 'command',
  ChatMessageType.qrShare: 'qrShare',
  ChatMessageType.invite: 'invite',
};

ChatParticipant _$ChatParticipantFromJson(Map<String, dynamic> json) =>
    ChatParticipant(
      userId: json['userId'] as String,
      userName: json['userName'] as String,
      role: $enumDecode(_$UserRoleEnumMap, json['role']),
      joinedAt: DateTime.parse(json['joinedAt'] as String),
      lastSeen: DateTime.parse(json['lastSeen'] as String),
      avatar: json['avatar'] as String?,
      isOnline: json['isOnline'] as bool,
    );

Map<String, dynamic> _$ChatParticipantToJson(ChatParticipant instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'userName': instance.userName,
      'role': _$UserRoleEnumMap[instance.role]!,
      'joinedAt': instance.joinedAt.toIso8601String(),
      'lastSeen': instance.lastSeen.toIso8601String(),
      'avatar': instance.avatar,
      'isOnline': instance.isOnline,
    };

const _$UserRoleEnumMap = {
  UserRole.master: 'master',
  UserRole.editor: 'editor',
  UserRole.viewer: 'viewer',
  UserRole.guest: 'guest',
};

ChatSettings _$ChatSettingsFromJson(Map<String, dynamic> json) => ChatSettings(
      allowPhotos: json['allowPhotos'] as bool,
      allowCommands: json['allowCommands'] as bool,
      allowItemSharing: json['allowItemSharing'] as bool,
      autoActions: json['autoActions'] as bool,
    );

Map<String, dynamic> _$ChatSettingsToJson(ChatSettings instance) =>
    <String, dynamic>{
      'allowPhotos': instance.allowPhotos,
      'allowCommands': instance.allowCommands,
      'allowItemSharing': instance.allowItemSharing,
      'autoActions': instance.autoActions,
    };

WarehouseChat _$WarehouseChatFromJson(Map<String, dynamic> json) =>
    WarehouseChat(
      warehouseId: json['warehouseId'] as String,
      participants: (json['participants'] as List<dynamic>)
          .map((e) => ChatParticipant.fromJson(e as Map<String, dynamic>))
          .toList(),
      messages: (json['messages'] as List<dynamic>)
          .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
          .toList(),
      lastActivity: DateTime.parse(json['lastActivity'] as String),
      settings: ChatSettings.fromJson(json['settings'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$WarehouseChatToJson(WarehouseChat instance) =>
    <String, dynamic>{
      'warehouseId': instance.warehouseId,
      'participants': instance.participants,
      'messages': instance.messages,
      'lastActivity': instance.lastActivity.toIso8601String(),
      'settings': instance.settings,
    };
