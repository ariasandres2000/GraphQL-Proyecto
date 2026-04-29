const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    name: { required: true, type: String },
    lastName: {required: true, type: String },
    email: {required: true, unique: true, trim: true, type: String},
    password: {requried: true, type: String},

});

const vehicleSchema = new mongoose.Schema({

    brand: {required:true, type: String},
    model: {requried: true, type: String},
    year: {required: true, type: Number},
    price: {required:true, type: Number},
    status: {required:true, type: String},
    plate: {required:true, type: String},
    ownerId: {required:true, type: String},

});

const User = mongoose.models.users || mongoose.model('users', userSchema);
const Vehicle = mongoose.models.vehicles || mongoose.model('vehicles', vehicleSchema);

const resolvers = {

    vehicles: async ({brand, model, minYear, maxYear, minPrice, maxPrice, status, page = 1, limit = 12}) => {
        const filter = {};

        if (brand) filter.brand = {$regex: brand, $options: 'i'};
        if (model) filter.model = {$regex: model, $options: 'i'};
        if (status) filter.status = status;

        if (minYear || maxYear) {
            filter.year = {};
            if (minYear) filter.year.$gte = minYear;
            if (maxYear) filter.year.$lte = maxYear;
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = minPrice;
            if (maxPrice) filter.price.$lte = maxPrice;
        }

        const pageNum = Math.max(1, page);
        const limitNum = Math.min(50, Math.max(1, limit));
        const skip = (pageNum - 1) * limitNum;

        const total = await Vehicle.countDocuments(filter);
        const vehicles = await Vehicle.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limitNum);

        const ownerIds = [...new Set(vehicles.map(v => v.ownerId))];
        const owners = await User.find({ _id: {$in: ownerIds}}, 'name lastName');
        const ownerMap = {};
        owners.forEach(o => {
            ownerMap[o._id.toString()] = { id: o._id.toString(), name: o.name, lastName: o.lastName};
        });

        const enriched = vehicles.map(v => ({
            id: v._id.toString(),
            brand: v.brand,
            model: v.model,
            year: v.year,
            price: v.price,
            status: v.status,
            plate: v.plate,
            ownerId: v.ownerId,
            owner: ownerMap[v.ownerId] || null,
        }));

        return{
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            limit: limitNum,
            vehicles: enriched,
        };
    },

    vehicle: async ({id}) => {
        const vehicle = await Vehicle.findById(id);
        if (!vehicle) return null;

        const owner = await User.findById(vehicle.ownerId, 'name lastName');

        return{
            id: vehicle._id.toString(),
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            price: vehicle.price,
            status: vehicle.status,
            plate: vehicle.plate,
            ownerId: vehicle.ownerId,
            owner: owner ? {
                id: owner._id.toString(),
                name: owner.name,
                lastName: owner.lastName,
            } : null,
        };
    },

    me: async (args, context) => {
        if (!context.user) {
            throw new Error ('No autenticado. Incluye el Token JWT en el header Authorization.');

        }

        const user = await User.findById(context.user.id);
        if (!user) throw new Error ('Usuario no encontrado');

        return {
            id: user._id.toString(),
            name: user.name,
            lastName: user.lastName,
            email: user.email,
        };
    },

    myVehicles: async (args, context) => {
        if (!context.user){
            throw new Error ('No autenticado. Incluye el Token JWT en el header Authorization.');
        }

        const vehicles = await Vehicle.find({ownerId: context.user.id}).sort({_id: -1 });

        return vehicles.map(v => ({
            id: v._id.toString(),
            brand: v.brand,
            model: v.model,
            year: v.year,
            price: v.price,
            status: v.status,
            plate: v.plate,
            ownerId: v.ownerId,
        }));
    },
};

module.exports = resolvers;