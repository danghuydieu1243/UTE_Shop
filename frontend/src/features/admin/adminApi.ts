/** adminApi — scaffold for admin endpoints.
 *  Real endpoints are injected in Tasks 5–8.
 *  Tags are registered on baseApi so Tasks 5–8 can reference them.
 */
import { baseApi } from '../../shared/api/baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: () => ({}),
  overrideExisting: false,
});
