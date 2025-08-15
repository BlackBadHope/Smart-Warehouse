import 'package:flutter/material.dart';
import '../models/access_request.dart';

class AccessRequestCard extends StatelessWidget {
  final AccessRequest request;
  final VoidCallback? onApprove;
  final VoidCallback? onDeny;

  const AccessRequestCard({
    super.key,
    required this.request,
    this.onApprove,
    this.onDeny,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B), // zinc-900
        border: Border.all(
          color: _getStatusColor(request.status), 
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
                    color: const Color(0xFF1F2937), // gray-800
                    border: Border.all(color: _getStatusColor(request.status), width: 1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    _getStatusIcon(request.status),
                    color: _getStatusColor(request.status),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Access Request',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFB923C), // orange-400
                          fontFamily: 'monospace',
                        ),
                      ),
                      Text(
                        _getStatusText(request.status),
                        style: TextStyle(
                          fontSize: 12,
                          color: _getStatusColor(request.status),
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  _formatTime(request.requestTime),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF6B7280), // gray-500
                    fontFamily: 'monospace',
                  ),
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
                    request.warehouseName,
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
            
            // Requester info
            Row(
              children: [
                const Icon(
                  Icons.person,
                  color: Color(0xFF818CF8), // indigo-400
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  request.requesterName,
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
                  request.requesterIp,
                  style: const TextStyle(
                    color: Color(0xFF6B7280), // gray-500
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            
            // Message
            if (request.message != null && request.message!.isNotEmpty) ...[
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
                  '"${request.message}"',
                  style: const TextStyle(
                    color: Color(0xFFFBBF24), // yellow-400
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
            
            // Action buttons (только для pending запросов)
            if (request.status == AccessRequestStatus.pending && onApprove != null && onDeny != null) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onDeny,
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Deny'),
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
                      onPressed: onApprove,
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Approve'),
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
            
            // Response info (для обработанных запросов)
            if (request.status != AccessRequestStatus.pending && request.responseTime != null) ...[
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
                    'Responded ${_formatTime(request.responseTime!)}',
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

  Color _getStatusColor(AccessRequestStatus status) {
    switch (status) {
      case AccessRequestStatus.pending:
        return const Color(0xFFFBBF24); // yellow-400
      case AccessRequestStatus.approved:
        return const Color(0xFF4ADE80); // green-400
      case AccessRequestStatus.denied:
        return const Color(0xFFF87171); // red-400
      case AccessRequestStatus.expired:
        return const Color(0xFF6B7280); // gray-500
    }
  }

  IconData _getStatusIcon(AccessRequestStatus status) {
    switch (status) {
      case AccessRequestStatus.pending:
        return Icons.pending;
      case AccessRequestStatus.approved:
        return Icons.check_circle;
      case AccessRequestStatus.denied:
        return Icons.cancel;
      case AccessRequestStatus.expired:
        return Icons.schedule;
    }
  }

  String _getStatusText(AccessRequestStatus status) {
    switch (status) {
      case AccessRequestStatus.pending:
        return 'PENDING';
      case AccessRequestStatus.approved:
        return 'APPROVED';
      case AccessRequestStatus.denied:
        return 'DENIED';
      case AccessRequestStatus.expired:
        return 'EXPIRED';
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