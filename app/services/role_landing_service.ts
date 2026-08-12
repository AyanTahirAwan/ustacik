import type User from '#models/user'

const roleLandingPaths: Record<User['role'], string> = {
  customer: '/customer/profile',
  craftsman: '/craftsman',
  admin: '/admin',
}

export function getRoleLandingPath(role: User['role']) {
  return roleLandingPaths[role]
}
