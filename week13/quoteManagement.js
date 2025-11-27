//CRUD on quotes
import { getItems } from "./myLib/fetchUtils.js"
const quoteURL = `${import.meta.env.VITE_APP_URL}/quotess`
//GET Quotes
async function loadQuotes() {
  try {
    const quotes = await getItems(quoteURL)
    console.log(quotes)
    return quotes
  } catch (error) {
    alert(`Quote: ${error}`)
  }
}
export { loadQuotes }

 