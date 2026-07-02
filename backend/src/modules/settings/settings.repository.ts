import { Setting } from '../../db/models';

export async function get(key: string): Promise<string | null> {
  const row = await Setting.findByPk(key);
  return row ? row.value : null;
}

export async function set(key: string, value: string): Promise<void> {
  await Setting.upsert({ key, value, updated_at: new Date() });
}
