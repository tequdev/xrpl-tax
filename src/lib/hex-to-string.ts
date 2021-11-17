/*
 * string -> byte[] -> hex[] -> hex
 * hex -> hex[] -> byte[] -> string
 */

// string -> byte[]
function string2bytes(string: string) {
  var bytes = string.split('').map((char) => char.charCodeAt(0))
  return bytes
}

// byte[] -> hex[]
function bytes2hexs(bytes: any[]) {
  var hexs = bytes.map((byte) => byte.toString(16))
  return hexs
}

// hex[] -> hex
function hexs2hex(hexs: any[]) {
  var hex = hexs.join('')
  return hex
}

// hex -> hex[]
function hex2hexs(hex: any) {
  var hexs = []
  for (var i = 0; i < hex.length; i += 2) {
    hexs.push(hex.substr(i, 2))
  }
  return hexs
}

// hex[] -> byte[]
function hexs2bytes(hexs: any[]) {
  var bytes = hexs.map((hex) => parseInt(hex, 16))
  return bytes
}

// byte[] -> string
function bytes2string(bytes: any[]) {
  var string = bytes.map((byte) => String.fromCharCode(byte)).join('')
  return string
}

function hex2string(hex: any) {
  return bytes2string(hexs2bytes(hex2hexs(hex)))
}

function string2hex(str: any) {
  return hexs2hex(bytes2hexs(string2bytes(str)))
}

export { hex2string, string2hex }
