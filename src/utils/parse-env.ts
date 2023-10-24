const regExp = new RegExp(/\$([a-zA-Z_]+[a-zA-Z0-9_]*)/gm)

export const parseEnv = (input: string) => {
  const matches = input.matchAll(regExp)

  if (!matches) return input
  let result = input

  for (const match of matches) {
    const [input, name] = match
    const value = process.env[name]
    if (value !== undefined) {
      result = result.replaceAll(input, value)
    }
  }

  return result
}

export const parseEnvObj = <T extends object>(obj: T): T => {
  const parsed = Object.create(null)

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      parsed[key] = parseEnv(val)
    } else {
      parsed[key] = val
    }
  }

  return parsed
}
