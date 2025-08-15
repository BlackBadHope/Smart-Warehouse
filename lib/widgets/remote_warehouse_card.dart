import 'package:flutter/material.dart';

class RemoteWarehouse {
  final String id;
  final String name;
  final String ownerId;
  final String ownerName;
  final String ownerIp;
  final int roomCount;
  final int itemCount;
  final bool encryptionEnabled;
  final DateTime discoveredAt;

  const RemoteWarehouse({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.ownerName,
    required this.ownerIp,
    required this.roomCount,
    required this.itemCount,
    required this.encryptionEnabled,
    required this.discoveredAt,
  });

  factory RemoteWarehouse.fromJson(Map<String, dynamic> json, String ownerName, String ownerIp) {
    return RemoteWarehouse(
      id: json['id'],
      name: json['name'],
      ownerId: json['ownerId'],
      ownerName: ownerName,
      ownerIp: ownerIp,
      roomCount: json['roomCount'] ?? 0,
      itemCount: json['itemCount'] ?? 0,
      encryptionEnabled: json['encryptionEnabled'] ?? false,
      discoveredAt: DateTime.now(),
    );
  }
}

class RemoteWarehouseCard extends StatelessWidget {
  final RemoteWarehouse warehouse;
  final VoidCallback onTap;

  const RemoteWarehouseCard({
    super.key,
    required this.warehouse,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
            Icons.cloud_outlined,
            color: Color(0xFF818CF8), // indigo-400 для удаленных складов
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
              '${warehouse.roomCount} rooms • ${warehouse.itemCount} items',
              style: const TextStyle(
                color: Color(0xFFFBBF24), // yellow-400
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(
                  Icons.public, // Удаленные склады всегда публичные
                  size: 16,
                  color: Color(0xFF4ADE80), // green-400
                ),
                const SizedBox(width: 4),
                const Text(
                  'Public',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF4ADE80), // green-400
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(width: 12),
                if (warehouse.encryptionEnabled)
                  const Icon(
                    Icons.security,
                    size: 16,
                    color: Color(0xFF4ADE80), // green-400
                  ),
                const SizedBox(width: 12),
                Icon(
                  Icons.wifi,
                  size: 16,
                  color: Color(0xFF818CF8), // indigo-400
                ),
                const SizedBox(width: 4),
                Text(
                  warehouse.ownerIp,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF818CF8), // indigo-400
                    fontFamily: 'monospace',
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
              warehouse.ownerName,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280), // gray-500
                fontFamily: 'monospace',
              ),
            ),
            Text(
              _formatDiscoveredTime(warehouse.discoveredAt),
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

  String _formatDiscoveredTime(DateTime discoveredAt) {
    final now = DateTime.now();
    final diff = now.difference(discoveredAt);
    
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