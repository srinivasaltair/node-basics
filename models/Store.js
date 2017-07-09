const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');
const Schema = mongoose.Schema;

const storeSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter store name'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply Coordinates'
        }],
        address: {
            type: String,
            required: 'You must supply Address'
        }
    },
    photo: String,
    author: {
        type: Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
});

storeSchema.pre('save', async function(next) {
    if(!this.isModified('name')){
        next(); // skip it
        return; // stops the function
    }
    this.slug = slug(this.name);
    // find other store with same name and add -1, -2
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, i);
    const storeWithSlug = await this.constructor.find({slug: slugRegEx});

    if(storeWithSlug.length){
        this.slug = `${this.slug}-${storeWithSlug.length + 1}`
    }
    next();
});

storeSchema.statics.getTagsList = function () {
    return this.aggregate([
        { 
            $unwind: '$tags'
        },
        { $group: 
            {
                _id: '$tags', 
                count: { 
                    $sum: 1 
                }
            }
        },
        {
            $sort: {
                count: -1
            }
        }
    ]);
};

module.exports = mongoose.model('Store', storeSchema);