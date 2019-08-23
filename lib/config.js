var config = {
    // GAME CONFIG VARIABLES
    userMaxBalance: 1000, // TO-DO: balancing
    userInvSlots: 8, // TO-DO: balancing
    acctMaxUsers: 3,

    // PROTOCOL CONFIG - don't touch this unless you know what you're doing
    acctDataMessage: doc => JSON.stringify({
        type: "acct.data",
        data: {
            users: doc.users,
            last_login: doc.last_login
        }
    }),
    userDataMessage: doc => JSON.stringify({
        type: "user.data",
        data: {
            username: doc.username,
            balance: doc.balance,
            maxBalance: config.userMaxBalance,
            inventory: doc.inventory,
            invSlots: config.userInvSlots
        }
    })
}

module.exports = config