import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity functions and types
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  },
  types: {
    uint: (value: number) => ({ type: "uint", value }),
    principal: (value: string) => ({ type: "principal", value }),
    string: (value: string) => ({ type: "string", value }),
  },
}

// Mock contract state
let lastRewardId = 0
const rewards = new Map()
const redemptions = new Map()

// Mock contract calls
const contractCalls = {
  "add-reward": (name: string, description: string, cost: number, inventory: number) => {
    const rewardId = ++lastRewardId
    rewards.set(rewardId, {
      name: mockClarity.types.string(name),
      description: mockClarity.types.string(description),
      cost: mockClarity.types.uint(cost),
      inventory: mockClarity.types.uint(inventory),
    })
    return { success: true, value: mockClarity.types.uint(rewardId) }
  },
  "redeem-reward": (rewardId: number, amount: number) => {
    const reward = rewards.get(rewardId)
    if (!reward) {
      return { success: false, error: "err-not-found" }
    }
    if (reward.inventory.value < amount) {
      return { success: false, error: "err-insufficient-inventory" }
    }
    reward.inventory = mockClarity.types.uint(reward.inventory.value - amount)
    const key = `${mockClarity.tx.sender}-${rewardId}`
    const currentRedemptions = redemptions.get(key)?.amount.value || 0
    redemptions.set(key, { amount: mockClarity.types.uint(currentRedemptions + amount) })
    return { success: true, value: true }
  },
  "get-reward": (rewardId: number) => {
    const reward = rewards.get(rewardId)
    return reward ? { success: true, value: reward } : { success: false, error: "err-not-found" }
  },
  "get-user-redemptions": (user: string, rewardId: number) => {
    const key = `${user}-${rewardId}`
    const amount = redemptions.get(key)?.amount || mockClarity.types.uint(0)
    return { success: true, value: amount }
  },
}

describe("Redemption Contract", () => {
  beforeEach(() => {
    lastRewardId = 0
    rewards.clear()
    redemptions.clear()
  })
  
  it("should add a new reward", () => {
    const result = contractCalls["add-reward"]("Free Coffee", "Get a free coffee", 100, 50)
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(1))
    
    const reward = rewards.get(1)
    expect(reward).toBeDefined()
    expect(reward?.name).toEqual(mockClarity.types.string("Free Coffee"))
    expect(reward?.cost).toEqual(mockClarity.types.uint(100))
  })
  
  it("should redeem a reward", () => {
    contractCalls["add-reward"]("Free Coffee", "Get a free coffee", 100, 50)
    const result = contractCalls["redeem-reward"](1, 2)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    const reward = rewards.get(1)
    expect(reward?.inventory).toEqual(mockClarity.types.uint(48))
    
    const userRedemptions = redemptions.get(`${mockClarity.tx.sender}-1`)
    expect(userRedemptions?.amount).toEqual(mockClarity.types.uint(2))
  })
  
  it("should fail to redeem a reward with insufficient inventory", () => {
    contractCalls["add-reward"]("Limited Reward", "A very limited reward", 100, 1)
    const result = contractCalls["redeem-reward"](1, 2)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-insufficient-inventory")
  })
  
  it("should fail to redeem a non-existent reward", () => {
    const result = contractCalls["redeem-reward"](999, 1)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
  
  it("should get reward details", () => {
    contractCalls["add-reward"]("Free Coffee", "Get a free coffee", 100, 50)
    const result = contractCalls["get-reward"](1)
    expect(result.success).toBe(true)
    expect(result.value.name).toEqual(mockClarity.types.string("Free Coffee"))
    expect(result.value.cost).toEqual(mockClarity.types.uint(100))
  })
  
  it("should fail to get non-existent reward details", () => {
    const result = contractCalls["get-reward"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
  
  it("should get user's redemption history", () => {
    contractCalls["add-reward"]("Free Coffee", "Get a free coffee", 100, 50)
    contractCalls["redeem-reward"](1, 3)
    const result = contractCalls["get-user-redemptions"](mockClarity.tx.sender, 1)
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(3))
  })
  
  it("should return zero for user with no redemptions", () => {
    contractCalls["add-reward"]("Free Coffee", "Get a free coffee", 100, 50)
    const result = contractCalls["get-user-redemptions"]("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 1)
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(0))
  })
})

