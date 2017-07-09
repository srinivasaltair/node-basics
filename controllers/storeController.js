const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto) {
            next(null, true); 
        } else {
            next({ message: 'This file type isnt allowed!' }, false)
        }
    }
};

exports.homePage = (req, res) => {
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', {
        title: 'Add Store'
    });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
    // if there is no new file to resize
    if (!req.file ) {
        next(); // skip to next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    // Now we resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
};

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created ${store.name}`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    res.render('stores', { title: 'Stores', stores: stores })
};

const confirmOwner = (store, user) => {
    if(!store.author.equals(user._id)){
        throw Error('You must own store to edit');
    }
};

exports.editStore = async (req, res) => {
    // 1. Find the store given by Id
    const store = await Store.findOne({_id: req.params.id});
    // 2. Confirm Store owner
    confirmOwner(store, req.user);
    // 3. Render out the form to edit
    res.render('editStore', {
        title: `Edit ${store.name}`,
        store: store
    })
};

exports.updateStore = async (req, res) => {
    if(req.body.location){
        req.body.location.type = 'Point';
    }
    // find and update store
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true, // return new store instead of old one
        runValidators: true
    }).exec();
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
    // Redirect to store
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug}).populate('author');
    if(!store) return next();
    res.render('store', {store, title: store.name})
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true};
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({tags: tagQuery});
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

    res.render('tag', {
        tags, 
        title: 'Tags', 
        tag,
        stores
    });
};