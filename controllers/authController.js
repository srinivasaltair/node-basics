const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Login Failed!',
    successRedirect: '/',
    successFlash: 'Successfully Logged in!'
})

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are logged out');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    // Check if user is authenticated
    if(req.isAuthenticated()) {
        next(); // Logged in
        return;
    }
    req.flash('error', 'Oops you must be logged in!');
    res.redirect('/login');
}

exports.forgot = async (req, res) => {
    // 1. See if user exists
    const user = await User.findOne({ email: req.body.email});
    if (!user){
        req.flash('error', 'User not found!!');
        return res.redirect('/login');
    };
    // 2. Set pwd Tokens and expiry on their account
    user.passwordResetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 Hour from now
    await user.save();
    // 3. Send them an email
    const resetURL = `http://${req.headers.host}/account/reset/${user.passwordResetToken}`;
    await mail.send({
        user,
        filename: 'password-reset',
        subject: 'Password Reset',
        resetURL
    })
    req.flash('success', `You have been emailed a password reset link.`);
    // 4. Redirect to login page
    res.redirect('/login');
}

exports.reset = async(req, res) => {
    const user = await User.findOne({ 
        passwordResetToken: req.params.token,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    });

    if (!user) {
        req.flash('error', 'Password reset token is invalid or expired');
        return redirect('/login');
    }
    // if there is user, show the reset password form
    res.render('reset', {title: 'Reset password'});
}

exports.confirmedPasswords = (req, res, next) => {
    if(req.body.password === req.body['confirm-password']){
        next();
        return;
    }
    req.flash('error', 'Passwords doesnt match');
    res.redirect('back');
}

exports.update = async (req, res) => {
    const user = await User.findOne({ 
        passwordResetToken: req.params.token,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    });

    if (!user) {
        req.flash('error', 'Password reset token is invalid or expired');
        return redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.passwordResetToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', 'Password has been updated successfully');
    res.redirect('/');
}