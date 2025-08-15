// Детальный просмотр комнаты с контейнерами
// Навигация: Room → Shelves → Items

import 'package:flutter/material.dart';
import '../models/warehouse.dart';
import '../services/database_service.dart';
import 'shelf_detail_screen.dart';

class RoomDetailScreen extends StatefulWidget {
  final Room room;

  const RoomDetailScreen({super.key, required this.room});

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  final DatabaseService _dbService = DatabaseService();
  List<Shelf> _shelves = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadShelves();
  }

  Future<void> _loadShelves() async {
    setState(() => _isLoading = true);
    try {
      final shelves = await _dbService.getShelves(widget.room.id);
      setState(() {
        _shelves = shelves;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка загрузки: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _showCreateShelfDialog() async {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Создать контейнер'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Название контейнера',
                  hintText: 'Например: Полка А1',
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Описание (опционально)',
                  hintText: 'Краткое описание контейнера',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Отмена'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Введите название контейнера')),
                  );
                  return;
                }
                Navigator.of(context).pop(true);
              },
              child: const Text('Создать'),
            ),
          ],
        );
      },
    );

    if (result == true && nameController.text.trim().isNotEmpty) {
      try {
        final shelf = Shelf(
          roomId: widget.room.id,
          name: nameController.text.trim(),
          description: descriptionController.text.trim(),
        );
        
        await _dbService.createShelf(shelf);
        await _loadShelves();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Полка создана!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка создания: ${e.toString()}')),
          );
        }
      }
    }
  }

  Future<void> _deleteShelf(Shelf shelf) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Удалить контейнер'),
          content: Text('Вы уверены, что хотите удалить контейнер "${shelf.name}"? '
                       'Все предметы в нём будут удалены.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Отмена'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: const Text('Удалить'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      try {
        await _dbService.deleteShelf(shelf.id);
        await _loadShelves();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Полка удалена')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка удаления: ${e.toString()}')),
          );
        }
      }
    }
  }

  Widget _buildShelfCard(Shelf shelf) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Colors.purple,
          child: Icon(Icons.shelves, color: Colors.white),
        ),
        title: Text(
          shelf.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: shelf.description.isNotEmpty 
            ? Text(shelf.description) 
            : null,
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'delete') {
              _deleteShelf(shelf);
            }
          },
          itemBuilder: (BuildContext context) => [
            const PopupMenuItem<String>(
              value: 'delete',
              child: ListTile(
                leading: Icon(Icons.delete, color: Colors.red),
                title: Text('Удалить'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ShelfDetailScreen(shelf: shelf),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.room.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadShelves,
          ),
        ],
      ),
      body: Column(
        children: [
          // Информация о комнате
          if (widget.room.description.isNotEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                widget.room.description,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
          
          // Статистика
          Container(
            width: double.infinity,
            margin: EdgeInsets.symmetric(
              horizontal: 16, 
              vertical: widget.room.description.isEmpty ? 16 : 0,
            ),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.shelves,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
                const SizedBox(width: 8),
                Text(
                  '${_shelves.length} ${_shelves.length == 1 ? 'контейнер' : 'контейнеров'}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
              ],
            ),
          ),
          
          // Список полок
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _shelves.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.shelves,
                              size: 80,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Нет контейнеров',
                              style: TextStyle(
                                fontSize: 24,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Создайте первый контейнер в комнате',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[500],
                              ),
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _showCreateShelfDialog,
                              icon: const Icon(Icons.add),
                              label: const Text('Создать контейнер'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadShelves,
                        child: ListView.builder(
                          itemCount: _shelves.length,
                          itemBuilder: (context, index) {
                            return _buildShelfCard(_shelves[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateShelfDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}