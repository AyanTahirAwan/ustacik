import type User from '#models/user'

const roleLandingPaths: Record<User['role'], string> = {
  customer: '/craftsmen',
  craftsman: '/craftsman',
  admin: '/admin',
}

export function getRoleLandingPath(role: User['role']) {
  return roleLandingPaths[role]
}
