/**
 * Function to search for volumes in the Google Books API.
 *
 * @param {Object} args - Arguments for the search.
 * @param {string} args.q - The search query for volumes.
 * @returns {Promise<Object>} - The result of the volume search.
 */
const executeFunction = async ({ q }) => {
  const baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  try {
    // Construct the URL with query parameters
    const url = new URL(baseUrl);
    url.searchParams.append('q', q);

    // Perform the fetch request
    const response = await fetch(url.toString(), {
      method: 'GET'
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData);
    }

    // Parse and return the response data
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching for volumes:', error);
    return { error: 'An error occurred while searching for volumes.' };
  }
};

/**
 * Tool configuration for searching volumes in the Google Books API.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'search_volumes',
      description: 'Search for volumes in the Google Books API.',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'The search query for volumes.'
          }
        },
        required: ['q']
      }
    }
  }
};

export { apiTool };