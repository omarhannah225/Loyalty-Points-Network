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
    bool: (value: boolean) => ({ type: "bool", value }),
  },
}

// Mock contract state
let lastProgramId = 0
const loyaltyPrograms = new Map()
const pointBalances = new Map()

// Mock contract calls
const contractCalls = {
  "create-loyalty-program": (name: string, pointName: string) => {
    const programId = ++lastProgramId
    loyaltyPrograms.set(programId, {
      name: mockClarity.types.string(name),
      owner: mockClarity.types.principal(mockClarity.tx.sender),
      "point-name": mockClarity.types.string(pointName),
      active: mockClarity.types.bool(true),
    })
    return { success: true, value: mockClarity.types.uint(programId) }
  },
  "issue-points": (programId: number, user: string, amount: number) => {
    const program = loyaltyPrograms.get(programId)
    if (!program || program.owner.value !== mockClarity.tx.sender || !program.active.value) {
      return { success: false, error: "err-unauthorized" }
    }
    const key = `${programId}-${user}`
    const currentBalance = pointBalances.get(key)?.balance.value || 0
    pointBalances.set(key, { balance: mockClarity.types.uint(currentBalance + amount) })
    return { success: true, value: true }
  },
  "deactivate-program": (programId: number) => {
    const program = loyaltyPrograms.get(programId)
    if (!program || program.owner.value !== mockClarity.tx.sender) {
      return { success: false, error: "err-unauthorized" }
    }
    program.active = mockClarity.types.bool(false)
    return { success: true, value: true }
  },
  "get-loyalty-program": (programId: number) => {
    const program = loyaltyPrograms.get(programId)
    return program ? { success: true, value: program } : { success: false, error: "err-not-found" }
  },
  "get-point-balance": (programId: number, user: string) => {
    const key = `${programId}-${user}`
    const balance = pointBalances.get(key)?.balance || mockClarity.types.uint(0)
    return { success: true, value: balance }
  },
}

describe("Points Issuance Contract", () => {
  beforeEach(() => {
    lastProgramId = 0
    loyaltyPrograms.clear()
    pointBalances.clear()
  })
  
  it("should create a new loyalty program", () => {
    const result = contractCalls["create-loyalty-program"]("Coffee Rewards", "Coffee Points")
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(1))
    
    const program = loyaltyPrograms.get(1)
    expect(program).toBeDefined()
    expect(program?.name).toEqual(mockClarity.types.string("Coffee Rewards"))
    expect(program?.["point-name"]).toEqual(mockClarity.types.string("Coffee Points"))
  })
  
  it("should issue points to a user", () => {
    contractCalls["create-loyalty-program"]("Coffee Rewards", "Coffee Points")
    const result = contractCalls["issue-points"](1, "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 100)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    const balance = pointBalances.get("1-ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    expect(balance?.balance).toEqual(mockClarity.types.uint(100))
  })
  
  it("should fail to issue points for non-existent program", () => {
    const result = contractCalls["issue-points"](999, "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 100)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-unauthorized")
  })
  
  it("should deactivate a loyalty program", () => {
    contractCalls["create-loyalty-program"]("Coffee Rewards", "Coffee Points")
    const result = contractCalls["deactivate-program"](1)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    const program = loyaltyPrograms.get(1)
    expect(program?.active).toEqual(mockClarity.types.bool(false))
  })
  
  it("should fail to deactivate a non-existent program", () => {
    const result = contractCalls["deactivate-program"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-unauthorized")
  })
  
  it("should get loyalty program details", () => {
    contractCalls["create-loyalty-program"]("Coffee Rewards", "Coffee Points")
    const result = contractCalls["get-loyalty-program"](1)
    expect(result.success).toBe(true)
    expect(result.value.name).toEqual(mockClarity.types.string("Coffee Rewards"))
    expect(result.value["point-name"]).toEqual(mockClarity.types.string("Coffee Points"))
  })
  
  it("should fail to get non-existent program details", () => {
    const result = contractCalls["get-loyalty-program"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
  
  it("should get user's point balance", () => {
    contractCalls["create-loyalty-program"]("Coffee Rewards", "Coffee Points")
    contractCalls["issue-points"](1, "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 100)
    const result = contractCalls["get-point-balance"](1, "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(100))
  })
  
  it("should return zero balance for user with no points", () => {
    contractCalls["create-loyalty-program"]("Coffee Rewards", "Coffee Points")
    const result = contractCalls["get-point-balance"](1, "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(0))
  })
})
