import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/warehouse.dart';
import '../widgets/remote_warehouse_card.dart';
import '../provider/access/role_invitation_provider.dart';

class RoleInviteDialog extends ConsumerStatefulWidget {
  final RemoteWarehouse targetWarehouse;
  final String targetDeviceIp;
  final int targetPort;

  const RoleInviteDialog({
    super.key,
    required this.targetWarehouse,
    required this.targetDeviceIp,
    required this.targetPort,
  });

  @override
  ConsumerState<RoleInviteDialog> createState() => _RoleInviteDialogState();
}

class _RoleInviteDialogState extends ConsumerState<RoleInviteDialog> {
  UserRole selectedRole = UserRole.viewer;
  final messageController = TextEditingController();
  bool isLoading = false;

  @override
  void dispose() {
    messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF1F2937), // gray-800
              border: Border.all(color: const Color(0xFFEAB308), width: 1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.person_add,
              color: Color(0xFFFBBF24), // yellow-400
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Request Access',
              style: TextStyle(
                color: Color(0xFFFB923C), // orange-400
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Warehouse info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1F2937), // gray-800
                border: Border.all(color: const Color(0xFFEAB308), width: 1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.warehouse,
                        color: Color(0xFFFBBF24), // yellow-400
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        widget.targetWarehouse.name,
                        style: const TextStyle(
                          color: Color(0xFFFBBF24), // yellow-400
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.person,
                        color: Color(0xFF818CF8), // indigo-400
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        widget.targetWarehouse.ownerName,
                        style: const TextStyle(
                          color: Color(0xFF818CF8), // indigo-400
                          fontFamily: 'monospace',
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Icon(
                        Icons.wifi,
                        color: Color(0xFF6B7280), // gray-500
                        size: 12,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        widget.targetDeviceIp,
                        style: const TextStyle(
                          color: Color(0xFF6B7280), // gray-500
                          fontFamily: 'monospace',
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Role selection
            const Text(
              'Requested Role',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFFFB923C), // orange-400
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 12),
            
            ...UserRole.values.map((role) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: selectedRole == role 
                  ? const Color(0xFF1F2937) // gray-800
                  : const Color(0xFF000000), // black
                border: Border.all(
                  color: selectedRole == role 
                    ? const Color(0xFFEAB308) // yellow-500
                    : const Color(0xFF374151), // gray-700
                  width: selectedRole == role ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: RadioListTile<UserRole>(
                value: role,
                groupValue: selectedRole,
                onChanged: (value) {
                  setState(() {
                    selectedRole = value!;
                  });
                },
                title: Text(
                  _getRoleDisplayName(role),
                  style: TextStyle(
                    color: selectedRole == role 
                      ? const Color(0xFFFBBF24) // yellow-400
                      : const Color(0xFF9CA3AF), // gray-400
                    fontFamily: 'monospace',
                    fontWeight: selectedRole == role ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
                subtitle: Text(
                  _getRoleDescription(role),
                  style: TextStyle(
                    color: selectedRole == role 
                      ? const Color(0xFF6B7280) // gray-500
                      : const Color(0xFF4B5563), // gray-600
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
                activeColor: const Color(0xFFEAB308), // yellow-500
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              ),
            )).toList(),
            
            const SizedBox(height: 16),
            
            // Message
            const Text(
              'Message (optional)',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFFFBBF24), // yellow-400
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: messageController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Why do you need access?',
                contentPadding: EdgeInsets.all(12),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton.icon(
          onPressed: isLoading ? null : _sendInvite,
          icon: isLoading 
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.send, size: 16),
          label: Text(isLoading ? 'Sending...' : 'Send Request'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF14532D), // green-900
            foregroundColor: const Color(0xFF4ADE80), // green-400
            side: const BorderSide(color: Color(0xFF4ADE80)),
          ),
        ),
      ],
    );
  }

  Future<void> _sendInvite() async {
    setState(() {
      isLoading = true;
    });

    try {
      final success = await ref.read(roleInvitationProvider.notifier).sendRoleInvite(
        targetDeviceIp: widget.targetDeviceIp,
        targetPort: widget.targetPort,
        warehouseId: widget.targetWarehouse.id,
        role: selectedRole,
        message: messageController.text.trim().isEmpty ? null : messageController.text.trim(),
      );

      if (success && mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Access request sent to ${widget.targetWarehouse.ownerName}'),
            backgroundColor: const Color(0xFF14532D), // green-900
          ),
        );
      } else if (mounted) {
        final error = ref.read(roleInvitationProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Failed to send request'),
            backgroundColor: const Color(0xFF7F1D1D), // red-900
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
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

  String _getRoleDescription(UserRole role) {
    switch (role) {
      case UserRole.master:
        return 'Full access - manage everything';
      case UserRole.editor:
        return 'Edit items and manage content';
      case UserRole.viewer:
        return 'View all content (read-only)';
      case UserRole.guest:
        return 'Limited view access';
    }
  }
}