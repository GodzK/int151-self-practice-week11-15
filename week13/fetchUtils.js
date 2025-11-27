async function getItems(url) {
  let message = ""
  try {
    const res = await fetch(url) 
    console.log(res)
    if (!res.ok) {
      switch (res.status) {
        case 404:
          message = "404 - Item not found"
          break
        case 409:
          message = "409 - Conflict"
          break
        default:
          message = "Fail to get item, please try again"
      }
      throw new Error(message)
    }
    const data = await res.json() 
    console.log(data)
    return data
  } catch (error) {
    throw new Error(error.message)
  }
}
export { getItems }
 