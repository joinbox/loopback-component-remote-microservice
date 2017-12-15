// @note: the data is wrapped into a function to avoid modification of the base data (side-effects)
module.exports = function(){
    return [
        {
            name: 'Book',
            path: '/books',
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
};
