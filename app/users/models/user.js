import _ from 'lodash';

class User {
    /**
     * The User class
     * @class
     * @param  {object} user
     * @return {object} A User
     */
    constructor(user) {
        _.extend(this, user);

        console.log(this);
    }
}

export default User;
