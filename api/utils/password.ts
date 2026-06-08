import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个大写字母' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个小写字母' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个数字' }
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个特殊字符' }
  }
  return { valid: true, message: '密码强度符合要求' }
}

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
}
