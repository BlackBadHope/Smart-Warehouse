import 'package:flutter/material.dart';

class AppColors {
  // Terminal/ASCII цветовая схема из оригинального React приложения
  static const Color background = Color(0xFF000000); // bg-black
  static const Color primaryText = Color(0xFFFBBF24); // text-yellow-400  
  static const Color accentText = Color(0xFFFB923C); // text-orange-400
  static const Color border = Color(0xFFEAB308); // border-yellow-500
  static const Color buttonBackground = Color(0xFF1F2937); // bg-gray-800
  static const Color buttonHover = Color(0xFF374151); // hover:bg-gray-700
  static const Color inputBackground = Color(0xFF18181B); // bg-zinc-900
  static const Color modalBackground = Color(0xFF18181B); // bg-zinc-900
  
  // Status colors
  static const Color error = Color(0xFF991B1B); // bg-red-800
  static const Color errorText = Color(0xFFFECDD3); // text-red-200
  static const Color success = Color(0xFF166534); // bg-green-800
  static const Color successText = Color(0xFFBBF7D0); // text-green-200
  
  // Priority colors (как в оригинале)
  static const Color priorityHigh = Color(0xFF7F1D1D); // bg-red-900
  static const Color priorityHighText = Color(0xFFF87171); // text-red-400
  static const Color priorityNormal = Color(0xFF14532D); // bg-green-900
  static const Color priorityNormalText = Color(0xFF4ADE80); // text-green-400
  static const Color priorityLow = Color(0xFF1E3A8A); // bg-blue-900
  static const Color priorityLowText = Color(0xFF60A5FA); // text-blue-400
  static const Color priorityDispose = Color(0xFF1F2937); // bg-gray-800
  static const Color priorityDisposeText = Color(0xFF6B7280); // text-gray-500
  
  // Tags
  static const Color tagBackground = Color(0xFF312E81); // bg-indigo-900
  static const Color tagText = Color(0xFF818CF8); // text-indigo-400
  
  // Selected state (желтая подсветка как в оригинале)
  static const Color selected = Color(0xFFEAB308); // bg-yellow-600
  static const Color selectedText = Color(0xFF000000); // text-black
  
  static Color getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return priorityHigh;
      case 'normal':
        return priorityNormal;
      case 'low':
        return priorityLow;
      case 'dispose':
        return priorityDispose;
      default:
        return priorityNormal;
    }
  }
  
  static Color getPriorityTextColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return priorityHighText;
      case 'normal':
        return priorityNormalText;
      case 'low':
        return priorityLowText;
      case 'dispose':
        return priorityDisposeText;
      default:
        return priorityNormalText;
    }
  }
}