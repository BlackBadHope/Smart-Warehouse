import 'package:flutter/material.dart';
import '../models/warehouse.dart';

class WarehouseCard extends StatelessWidget {
  final Warehouse warehouse;
  final VoidCallback onTap;

  const WarehouseCard({
    super.key,
    required this.warehouse,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final roomCount = warehouse.rooms?.length ?? 0;
    final itemCount = _getTotalItemCount();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B), // zinc-900
        border: Border.all(color: const Color(0xFFEAB308), width: 1), // yellow-500 border
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFF1F2937), // gray-800
            border: Border.all(color: const Color(0xFFEAB308), width: 1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.warehouse,
            color: Color(0xFFFBBF24), // yellow-400
            size: 20,
          ),
        ),
        title: Text(
          warehouse.name,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Color(0xFFFB923C), // orange-400 accent
            fontFamily: 'monospace',
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              '$roomCount rooms • $itemCount items',
              style: const TextStyle(
                color: Color(0xFFFBBF24), // yellow-400
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  warehouse.accessControl.accessLevel == AccessLevel.public ? Icons.public : Icons.lock,
                  size: 16,
                  color: warehouse.accessControl.accessLevel == AccessLevel.public 
                    ? const Color(0xFF4ADE80) // green-400 для public
                    : const Color(0xFFF87171), // red-400 для private
                ),
                const SizedBox(width: 4),
                Text(
                  warehouse.accessControl.accessLevel == AccessLevel.public ? 'Public' : 'Private',
                  style: TextStyle(
                    fontSize: 12,
                    color: warehouse.accessControl.accessLevel == AccessLevel.public 
                      ? const Color(0xFF4ADE80) // green-400 для public
                      : const Color(0xFFF87171), // red-400 для private
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(width: 12),
                if (warehouse.accessControl.encryptionEnabled)
                  const Icon(
                    Icons.security,
                    size: 16,
                    color: Color(0xFF4ADE80), // green-400
                  ),
                if (warehouse.networkVisible)
                  const Padding(
                    padding: EdgeInsets.only(left: 8),
                    child: Icon(
                      Icons.wifi,
                      size: 16,
                      color: Color(0xFF818CF8), // indigo-400
                    ),
                  ),
              ],
            ),
          ],
        ),
        trailing: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'v${warehouse.syncVersion}',
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280), // gray-500
                fontFamily: 'monospace',
              ),
            ),
            if (warehouse.lastSync != null)
              Text(
                _formatDate(warehouse.lastSync!),
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF6B7280), // gray-500
                  fontFamily: 'monospace',
                ),
              ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }

  int _getTotalItemCount() {
    int total = 0;
    if (warehouse.rooms != null) {
      for (final room in warehouse.rooms!) {
        if (room.shelves != null) {
          for (final shelf in room.shelves!) {
            total += shelf.items?.length ?? 0;
          }
        }
      }
    }
    return total;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inDays}d ago';
    }
  }
}