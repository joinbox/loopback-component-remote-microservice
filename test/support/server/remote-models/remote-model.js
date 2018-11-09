module.exports = function(RemoteModel) {
    RemoteModel.sayHi = async function(name, ctx) {
        return `Hi ${name}`;
    };
};
