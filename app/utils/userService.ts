'use client'

// User session management service
// Now syncs with database API for cross-device user visibility

import * as api from './apiClient'

export interface User {
  discordId: string
  discordUsername?: string
  callsign: string
  vehicle: string
  loginTime: string
}

const USERS_KEY = 'logged_in_users'
const CURRENT_USER_KEY = 'current_user'

// Get all currently logged in users
export function getLoggedInUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_KEY)
    if (!data) return []
    const users = JSON.parse(data)
    // Filter out users who logged in more than 12 hours ago
    const now = new Date().getTime();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    return users.filter((user: User) => {
      const loginTime = new Date(user.loginTime).getTime();
      return now - loginTime < twelveHoursMs;
    });
  } catch {
    return []
  }
}

// Add a user to the logged in list
export function addLoggedInUser(user: User): void {
  const users = getLoggedInUsers()
  // Remove existing entry for same user
  const filtered = users.filter(u => u.discordId !== user.discordId)
  filtered.push(user)
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered))
}

// Remove a user from the logged in list
export function removeLoggedInUser(discordId: string): void {
  const users = getLoggedInUsers()
  const filtered = users.filter(u => u.discordId !== discordId)
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered))
}

// Get current user
export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

// Set current user (also syncs to API)
export function setCurrentUser(user: User): void {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  addLoggedInUser(user)
  
  // Fire and forget API call to register user login
  api.loginUser(
    user.discordId,
    user.discordUsername || '',
    user.callsign,
    user.vehicle
  ).catch(err => console.error('Failed to sync user login to API:', err))
}

// Async version for when you need to wait for API
export async function setCurrentUserAsync(user: User): Promise<void> {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  addLoggedInUser(user)
  
  try {
    await api.loginUser(
      user.discordId,
      user.discordUsername || '',
      user.callsign,
      user.vehicle
    )
  } catch (err) {
    console.error('Failed to sync user login to API:', err)
  }
}

// Clear current user (logout)
export function clearCurrentUser(): void {
  const current = getCurrentUser()
  if (current) {
    removeLoggedInUser(current.discordId)
  }
  localStorage.removeItem(CURRENT_USER_KEY)
}

// Get other logged in users (excluding current)
export function getOtherLoggedInUsers(): User[] {
  const current = getCurrentUser()
  if (!current) return getLoggedInUsers()
  return getLoggedInUsers().filter(u => u.discordId !== current.discordId)
}

// Get other logged in users from API (async)
export async function getOtherLoggedInUsersAsync(): Promise<User[]> {
  try {
    const current = getCurrentUser()
    const apiUsers = await api.getActiveUsers()
    
    return apiUsers
      .filter(u => u.discord_id !== current?.discordId)
      .map(u => ({
        discordId: u.discord_id,
        discordUsername: u.discord_username,
        callsign: u.callsign,
        vehicle: u.vehicle,
        loginTime: u.last_login
      }))
  } catch (error) {
    console.error('Failed to get users from API:', error)
    return getOtherLoggedInUsers()
  }
}
