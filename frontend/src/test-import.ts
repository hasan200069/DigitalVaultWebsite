// Test file to verify imports work
import * as SearchAPI from './services/searchApi';

console.log('SearchAPI:', SearchAPI);
console.log('SearchFilters type:', typeof SearchAPI.SearchFilters);
console.log('searchApiService:', SearchAPI.searchApiService);

export default SearchAPI;