// @note: the data is wrapped into a function to avoid modification of the base data (side-effects)
module.exports = function(exclude = []){
    const response = [
        {
            name: 'Book',
            path: '/books',
        },
        {
            name: 'Page',
            path: '/pages',
        },
        {
            name: 'Author',
            path: '/authors',
        },
        {
            name: 'Publisher',
            path: '/publishers',
        },
    ];
    return response.filter((entry) => exclude.indexOf(entry.name) === -1);
};
