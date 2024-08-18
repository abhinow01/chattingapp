import React from 'react';

function SearchBar() {
  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Search"
        className="w-full p-2 border rounded-lg"
      />
    </div>
  );
}
export default SearchBar