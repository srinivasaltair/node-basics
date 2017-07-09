const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const md5 = require('md5');
const validator = require('validator');
const mongooseErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Invalid Email Address'],
        required: 'Please enter your Email Address'
    },
    name: {
        type: String,
        required: 'Please specify a name',
        trim: true
    },
    passwordResetToken: String,
    resetPasswordExpires: Date
});

userSchema.virtual('gravatar').get(function(){
    const hash = md5(this.email);
    return `https://gravatar.com/avatar/${hash}?s=200`;
});

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
userSchema.plugin(mongooseErrorHandler);

module.exports = mongoose.model('User', userSchema);