// Hook trả về Set<number> các bookId user đã sở hữu, để tra O(1) trong catalog.
// Chỉ fetch khi user đã đăng nhập với role 'user' (chỉ role này có entitlement).
import { useMemo } from 'react';
import { useAppSelector } from '../../app/hooks';
import { useGetOwnedBookIdsQuery } from './libraryApi';

export function useOwnedBookIds(): Set<number> {
  const user = useAppSelector((s) => s.auth.user);
  const enabled = user?.role === 'user';

  const { data } = useGetOwnedBookIdsQuery(undefined, { skip: !enabled });

  return useMemo(() => new Set(data ?? []), [data]);
}
