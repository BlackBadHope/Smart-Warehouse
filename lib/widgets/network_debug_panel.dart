import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../provider/network/server/server_provider.dart';
import '../provider/network/discovery/device_discovery_provider.dart';

class NetworkDebugPanel extends ConsumerWidget {
  const NetworkDebugPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final serverState = ref.watch(serverProvider);
    final discoveryState = ref.watch(deviceDiscoveryProvider);

    return Container(
      color: Colors.grey[100],
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.bug_report, size: 16),
              const SizedBox(width: 8),
              const Text(
                'Network Debug',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () {
                  ref.read(deviceDiscoveryProvider.notifier).startLegacyScan();
                },
                icon: const Icon(Icons.search, size: 16),
                label: const Text('Scan'),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 120,
            child: Row(
              children: [
                // Server logs
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Server Logs (${serverState.logs.length})',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: serverState.logs.isEmpty
                            ? const Center(
                                child: Text(
                                  'No logs yet',
                                  style: TextStyle(color: Colors.grey, fontSize: 12),
                                ),
                              )
                            : ListView.builder(
                                itemCount: serverState.logs.length,
                                itemBuilder: (context, index) {
                                  final log = serverState.logs[index];
                                  return Text(
                                    log,
                                    style: const TextStyle(
                                      color: Colors.green,
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                    ),
                                  );
                                },
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Discovery logs
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Discovery Logs (${discoveryState.logs.length})',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: discoveryState.logs.isEmpty
                            ? const Center(
                                child: Text(
                                  'No logs yet',
                                  style: TextStyle(color: Colors.grey, fontSize: 12),
                                ),
                              )
                            : ListView.builder(
                                itemCount: discoveryState.logs.length,
                                itemBuilder: (context, index) {
                                  final log = discoveryState.logs[index];
                                  return Text(
                                    log,
                                    style: const TextStyle(
                                      color: Colors.blue,
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                    ),
                                  );
                                },
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}