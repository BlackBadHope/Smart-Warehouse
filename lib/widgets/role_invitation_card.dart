import 'package:flutter/material.dart';
import '../provider/access/role_invitation_provider.dart';
import '../models/warehouse.dart';

class RoleInvitationCard extends StatelessWidget {
  final RoleInvitation invitation;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;

  const RoleInvitationCard({
    super.key,
    required this.invitation,
    this.onAccept,
    this.onDecline,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B), // zinc-900
        border: Border.all(
          color: _getStatusColor(invitation.status), 
          width: 2,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _getRoleColor(invitation.role),
                    border: Border.all(color: _getStatusColor(invitation.status), width: 1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    _getRoleIcon(invitation.role),
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Role Invitation',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFB923C), // orange-400
                          fontFamily: 'monospace',
                        ),
                      ),
                      Text(
                        '${_getRoleDisplayName(invitation.role)} access',
                        style: TextStyle(
                          fontSize: 12,
                          color: _getRoleColor(invitation.role),
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _getStatusText(invitation.status),
                      style: TextStyle(
                        fontSize: 12,
                        color: _getStatusColor(invitation.status),
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _formatTime(invitation.createdAt),
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF6B7280), // gray-500
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Warehouse info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1F2937), // gray-800
                border: Border.all(color: const Color(0xFFEAB308), width: 1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.warehouse,
                    color: Color(0xFFFBBF24), // yellow-400
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    invitation.warehouseName,
                    style: const TextStyle(
                      color: Color(0xFFFBBF24), // yellow-400
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 12),
            
            // Inviter info
            Row(
              children: [
                const Icon(
                  Icons.person,
                  color: Color(0xFF818CF8), // indigo-400
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  invitation.inviterName,
                  style: const TextStyle(
                    color: Color(0xFF818CF8), // indigo-400
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 16),
                const Icon(
                  Icons.wifi,
                  color: Color(0xFF6B7280), // gray-500
                  size: 14,
                ),
                const SizedBox(width: 4),
                Text(
                  invitation.inviterIp,
                  style: const TextStyle(
                    color: Color(0xFF6B7280), // gray-500
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            
            // Role permissions preview
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF000000), // black
                border: Border.all(color: const Color(0xFF374151), width: 1), // gray-700
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Permissions:',
                    style: const TextStyle(
                      color: Color(0xFF9CA3AF), // gray-400
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: _getPermissions(invitation.role).map((permission) => 
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getRoleColor(invitation.role).withOpacity(0.2),
                          border: Border.all(color: _getRoleColor(invitation.role), width: 1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          permission,
                          style: TextStyle(
                            color: _getRoleColor(invitation.role),
                            fontFamily: 'monospace',
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ).toList(),
                  ),
                ],
              ),
            ),
            
            // Message
            if (invitation.message != null && invitation.message!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF000000), // black
                  border: Border.all(color: const Color(0xFF374151), width: 1), // gray-700
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '"${invitation.message}"',
                  style: const TextStyle(
                    color: Color(0xFFFBBF24), // yellow-400
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
            
            // Action buttons (только для pending приглашений)
            if (invitation.status == InvitationStatus.pending && onAccept != null && onDecline != null) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onDecline,
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Decline'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7F1D1D), // red-900
                        foregroundColor: const Color(0xFFF87171), // red-400
                        side: const BorderSide(color: Color(0xFFF87171)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onAccept,
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Accept'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF14532D), // green-900
                        foregroundColor: const Color(0xFF4ADE80), // green-400
                        side: const BorderSide(color: Color(0xFF4ADE80)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
            
            // Response info (для обработанных приглашений)
            if (invitation.status != InvitationStatus.pending && invitation.respondedAt != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.schedule,
                    size: 14,
                    color: const Color(0xFF6B7280), // gray-500
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Responded ${_formatTime(invitation.respondedAt!)}',
                    style: const TextStyle(
                      color: Color(0xFF6B7280), // gray-500
                      fontFamily: 'monospace',
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(InvitationStatus status) {
    switch (status) {
      case InvitationStatus.pending:
        return const Color(0xFFFBBF24); // yellow-400
      case InvitationStatus.accepted:
        return const Color(0xFF4ADE80); // green-400
      case InvitationStatus.declined:
        return const Color(0xFFF87171); // red-400
      case InvitationStatus.expired:
        return const Color(0xFF6B7280); // gray-500
    }
  }

  Color _getRoleColor(UserRole role) {
    switch (role) {
      case UserRole.master:
        return const Color(0xFF7C3AED); // purple-600
      case UserRole.editor:
        return const Color(0xFF2563EB); // blue-600
      case UserRole.viewer:
        return const Color(0xFF059669); // green-600
      case UserRole.guest:
        return const Color(0xFF6B7280); // gray-500
    }
  }

  IconData _getRoleIcon(UserRole role) {
    switch (role) {
      case UserRole.master:
        return Icons.admin_panel_settings;
      case UserRole.editor:
        return Icons.edit;
      case UserRole.viewer:
        return Icons.visibility;
      case UserRole.guest:
        return Icons.person;
    }
  }

  String _getStatusText(InvitationStatus status) {
    switch (status) {
      case InvitationStatus.pending:
        return 'PENDING';
      case InvitationStatus.accepted:
        return 'ACCEPTED';
      case InvitationStatus.declined:
        return 'DECLINED';
      case InvitationStatus.expired:
        return 'EXPIRED';
    }
  }

  String _getRoleDisplayName(UserRole role) {
    switch (role) {
      case UserRole.master:
        return 'Master';
      case UserRole.editor:
        return 'Editor';
      case UserRole.viewer:
        return 'Viewer';
      case UserRole.guest:
        return 'Guest';
    }
  }

  List<String> _getPermissions(UserRole role) {
    switch (role) {
      case UserRole.master:
        return ['Read', 'Write', 'Delete', 'Manage Users', 'Lock Items'];
      case UserRole.editor:
        return ['Read', 'Write', 'Lock Items'];
      case UserRole.viewer:
        return ['Read All'];
      case UserRole.guest:
        return ['Read (Limited)'];
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    
    if (diff.inMinutes < 1) {
      return 'just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inDays}d ago';
    }
  }
}