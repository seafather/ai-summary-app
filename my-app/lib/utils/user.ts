import { createHash } from 'crypto';
import { supabaseAdmin } from '../supabase/server';
import { User } from '../types/database';

/**
 * Hash user key using SHA-256
 */
export function hashUserKey(userKey: string): string {
  return createHash('sha256').update(userKey).digest('hex');
}

/**
 * Validate user key format
 */
export function isValidUserKey(userKey: string): boolean {
  return typeof userKey === 'string' && userKey.length >= 8 && userKey.length <= 255;
}

/**
 * Get or create user by user key
 */
export async function getOrCreateUser(userKey: string): Promise<User | null> {
  if (!isValidUserKey(userKey)) {
    throw new Error('Invalid user key. Must be 8-255 characters long.');
  }

  const userKeyHash = hashUserKey(userKey);

  // Try to find existing user
  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('user_key_hash', userKeyHash)
    .single();

  if (existingUser) {
    // Update last access time
    await supabaseAdmin
      .from('users')
      .update({ last_access_at: new Date().toISOString() })
      .eq('id', existingUser.id);

    return existingUser as User;
  }

  // Create new user if not found
  if (selectError?.code === 'PGRST116') { // Not found error
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        user_key: userKey,
        user_key_hash: userKeyHash,
        last_access_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return null;
    }

    return newUser as User;
  }

  console.error('Error fetching user:', selectError);
  return null;
}

/**
 * Generate a memorable user key
 */
export function generateUserKey(): string {
  const adjectives = ['swift', 'bright', 'clever', 'calm', 'bold', 'brave', 'wise', 'smart', 'quick', 'sharp'];
  const nouns = ['panda', 'eagle', 'tiger', 'falcon', 'wolf', 'lion', 'bear', 'hawk', 'fox', 'owl'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}
