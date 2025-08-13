
import React from 'react';
import { GitBranch, BrainCircuit, Zap, CheckCircle, ListChecks, PackageSearch, UserCheck, KeyRound } from 'lucide-react';
import { ASCII_COLORS } from '../constants';

interface InfoModalProps {
  show: boolean;
  onCancel: () => void;
}

const InfoSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className={`${ASCII_COLORS.inputBg} p-4 rounded-lg border ${ASCII_COLORS.border} border-opacity-70`}>
    <h3 className={`text-xl font-semibold mb-3 flex items-center ${ASCII_COLORS.accent}`}>
      {icon}
      {title}
    </h3>
    <div className={`space-y-2 text-sm ${ASCII_COLORS.text}`}>
      {children}
    </div>
  </div>
);

const ListItem: React.FC<{ children: React.ReactNode; type?: 'new' | 'fix' | 'improvement' | 'auth' }> = ({ children, type }) => {
  let icon = <Zap className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />;
  if (type === 'new') icon = <Zap className="w-4 h-4 mr-2 text-green-400 shrink-0" />;
  if (type === 'fix') icon = <CheckCircle className="w-4 h-4 mr-2 text-blue-400 shrink-0" />;
  if (type === 'improvement') icon = <ListChecks className="w-4 h-4 mr-2 text-indigo-400 shrink-0" />;
  if (type === 'auth') icon = <UserCheck className="w-4 h-4 mr-2 text-pink-400 shrink-0" />;
  
  return <li className="flex items-start">{icon}{children}</li>;
};

const InfoModal: React.FC<InfoModalProps> = ({ show, onCancel }) => {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center p-4 z-50`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-4xl border-2 ${ASCII_COLORS.border} max-h-[90vh] flex flex-col`}>
        <h2 className={`text-3xl font-bold mb-6 ${ASCII_COLORS.accent} text-center border-b-2 ${ASCII_COLORS.border} pb-3`}>
          [ INVENTORY OS - System Archives ]
        </h2>
        <div className="overflow-y-auto pr-2 flex-grow custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoSection title="✅ Текущие функции (v2.6)" icon={<GitBranch className="mr-2"/>}>
              <ul className="space-y-2">
                <ListItem type="new">**SMARTIE AI:** Множественные команды, мультивалютность, видит все склады</ListItem>
                <ListItem type="new">**P2P тестирование:** Социальные функции и сетевая синхронизация</ListItem>
                <ListItem type="new">**5 языков:** 🇺🇦🇷🇺🇺🇸🇩🇪🇵🇱 с блокировкой RUB для Украины</ListItem>
                <ListItem type="improvement">**14+ тем:** От "Неон" до "Высокий контраст"</ListItem>
                <ListItem type="improvement">**Self-Test система:** 22 теста, включая edge-cases</ListItem>
                <ListItem type="fix">**Штрих-коды:** PWA сканер для быстрого добавления</ListItem>
                <ListItem type="auth">**Пользователи:** Роли мастер/клиент/гость, персональные контейнеры</ListItem>
                <ListItem type="improvement">**Монетизация:** Freemium модель, PRO лицензии $9-19/мес</ListItem>
              </ul>
              <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs">
                <p className="text-red-400 font-semibold">🚨 Известные баги:</p>
                <p className="text-red-300">• "Warehouse not found" после создания</p>
                <p className="text-red-300">• Кнопка Transfer зависает</p>
                <p className="text-red-300">• Импорт требует перезапуска</p>
              </div>
            </InfoSection>

            <InfoSection title="🚧 Roadmap & Планы" icon={<BrainCircuit className="mr-2 w-6 h-6"/>}>
              <div className="mb-3 p-2 bg-red-600/20 border border-red-400/30 rounded text-xs">
                <p className="text-red-300 font-semibold">🔥 Спринт 1 (2 недели) - Критические баги:</p>
                <p className="text-red-200">• Исправить "Warehouse not found"</p>
                <p className="text-red-200">• Починить Transfer кнопку</p>
                <p className="text-red-200">• Автообновление после импорта</p>
              </div>
              <ul className="space-y-2">
                <ListItem><UserCheck className="w-4 h-4 mr-2 text-green-400 shrink-0" />**v2.7 - P2P система:** Публичные/приватные склады, роли мастер/клиент</ListItem>
                <ListItem><Zap className="w-4 h-4 mr-2 text-blue-400 shrink-0" />**v2.7 - Анимации:** Плавные переходы, loading состояния</ListItem>
                <ListItem><PackageSearch className="w-4 h-4 mr-2 text-teal-400 shrink-0" />**v2.7 - Поиск по тегам:** Сортировка, фильтры, глобальный поиск</ListItem>
                <ListItem><ListChecks className="w-4 h-4 mr-2 text-purple-400 shrink-0" />**v2.8 - Темы с логикой:** Детская, управляющего, разработчика</ListItem>
                <ListItem><KeyRound className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />**v2.8 - Visual View 2.0:** Иерархия, zoom, drag&drop</ListItem>
                <ListItem><Zap className="w-4 h-4 mr-2 text-pink-400 shrink-0" />**v3.0 - Концепт:** Виртуальные объекты, "каталогизация мира"</ListItem>
                <ListItem><ListChecks className="w-4 h-4 mr-2 text-orange-400 shrink-0" />**Enterprise:** API, IoT сенсоры, корпоративные функции</ListItem>
              </ul>
              <div className="mt-3 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs">
                <p className="text-green-400 font-semibold">💰 Монетизация:</p>
                <p className="text-green-300">• White-label лицензии: $1-5k</p>
                <p className="text-green-300">• Платные пилоты: $500-3k</p>
                <p className="text-green-300">• SaaS подписки: $9-19/мес</p>
              </div>
            </InfoSection>
          </div>
        </div>
        <div className="flex justify-center mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-6 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-lg`}
          >
            [ CLOSE ARCHIVES ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;