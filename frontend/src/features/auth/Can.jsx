// frontend/src/features/auth/Can.jsx
import useAuthStore from '../../store/auth.store';

/**
 * Conditionally render children if user has the required permission.
 * Usage: <Can permission="users:create"><button>Create</button></Can>
 *        <Can anyOf={['users:create','users:update']}><button>Save</button></Can>
 */
export default function Can({ permission, anyOf, children, fallback = null }) {
  const { hasPermission, hasAnyPermission } = useAuthStore();

  if (anyOf)      return hasAnyPermission(...anyOf) ? children : fallback;
  if (permission) return hasPermission(permission)   ? children : fallback;
  return children;
}
