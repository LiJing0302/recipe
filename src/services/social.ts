import { followRemote, getFollowingRemote, unfollowRemote } from './api'

const followingMemory = new Set<string>()
export const loadFollowing = async () => { const ids = await getFollowingRemote(); followingMemory.clear(); ids.forEach((id) => followingMemory.add(id)); return ids }
export const isFollowing = (authorId: string) => followingMemory.has(authorId)
export const toggleFollowing = async (authorId: string) => {
  const following = followingMemory.has(authorId)
  if (following) await unfollowRemote(authorId); else await followRemote(authorId)
  if (following) followingMemory.delete(authorId); else followingMemory.add(authorId)
  return !following
}
