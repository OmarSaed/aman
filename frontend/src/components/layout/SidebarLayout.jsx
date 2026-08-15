// frontend/src/components/layout/SidebarLayout.jsx
import Sidebar from './Sidebar';
import Topbar  from './Topbar';

export default function SidebarLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-content animate-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
