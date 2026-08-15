// frontend/src/components/layout/RoleRouter.jsx
import { Outlet } from 'react-router-dom';
import useAuthStore    from '../../store/auth.store';
import SidebarLayout   from './SidebarLayout';
import POSLayout       from './POSLayout';

export default function RoleRouter() {
  const { user } = useAuthStore();
  const roleName = user?.role?.name?.toLowerCase();
  const uiShell  = user?.role?.uiShell;

  // Management roles must always use the SIDEBAR shell to have access to full navigation
  if (roleName === 'admin' || roleName === 'manager' || roleName === 'accountant') {
    return <SidebarLayout><Outlet /></SidebarLayout>;
  }

  if (uiShell === 'POS') {
    return <POSLayout><Outlet /></POSLayout>;
  }
  return <SidebarLayout><Outlet /></SidebarLayout>;
}
