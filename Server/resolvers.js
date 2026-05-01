const mongoose = require('mongoose');

/**
 * Modelos — apuntan a la misma base de datos que el REST API.
 */
const userSchema = new mongoose.Schema({
    name: { required: true, type: String },
    lastName: { required: true, type: String },
    email: { required: true, unique: true, trim: true, type: String },
    password: { required: true, type: String },
});

const vehicleSchema = new mongoose.Schema({
    brand: { required: true, type: String },
    model: { required: true, type: String },
    year: { required: true, type: Number },
    price: { required: true, type: Number },
    status: { required: true, type: String },
    plate: { required: true, type: String },
    ownerId: { required: true, type: String },
});

const questionSchema = new mongoose.Schema({
    vehicleId: { required: true, type: String },
    fromUserId: { required: true, type: String },
    toUserId: { required: true, type: String },
    content: { required: true, type: String },
    creationDate: { type: Date, default: Date.now },
});

// Evita el error "Cannot overwrite model once compiled" al recargar con nodemon
const User = mongoose.models.users || mongoose.model('users', userSchema);
const Vehicle = mongoose.models.vehicles || mongoose.model('vehicles', vehicleSchema);
const Question = mongoose.models.questions || mongoose.model('questions', questionSchema);

/**
 * Resolvers — cada función corresponde a un query del schema.
 */
const resolvers = {

    // --- vehicles --------------------------------------------------------------
    vehicles: async ({ brand, model, minYear, maxYear, minPrice, maxPrice, status, page = 1, limit = 12 }) => {
        const filter = {};

        if (brand) filter.brand = { $regex: brand, $options: 'i' };
        if (model) filter.model = { $regex: model, $options: 'i' };
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
        const owners = await User.find({ _id: { $in: ownerIds } }, 'name lastName');
        const ownerMap = {};
        owners.forEach(o => {
            ownerMap[o._id.toString()] = { id: o._id.toString(), name: o.name, lastName: o.lastName };
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

        return {
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            limit: limitNum,
            vehicles: enriched,
        };
    },

    // --- vehicle ---------------------------------------------------------------
    vehicle: async ({ id }) => {
        const vehicle = await Vehicle.findById(id);
        if (!vehicle) return null;

        const owner = await User.findById(vehicle.ownerId, 'name lastName email');

        return {
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
                email: owner.email,
            } : null,
        };
    },

    // --- me --------------------------------------------------------------------
    me: async (args, context) => {
        if (!context.user) {
            throw new Error('No autenticado. Incluye el token JWT en el header Authorization.');
        }

        const user = await User.findById(context.user.id);
        if (!user) throw new Error('Usuario no encontrado.');

        return {
            id: user._id.toString(),
            name: user.name,
            lastName: user.lastName,
            email: user.email,
        };
    },

    // --- myVehicles ------------------------------------------------------------
    myVehicles: async (args, context) => {
        if (!context.user) {
            throw new Error('No autenticado. Incluye el token JWT en el header Authorization.');
        }

        const vehicles = await Vehicle.find({ ownerId: context.user.id }).sort({ _id: -1 });

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

    // --- questionThread --------------------------------------------------------
    questionThread: async ({ vehicleId, askerId }, context) => {
        if (!context.user) {
            throw new Error('No autenticado. Incluye el token JWT en el header Authorization.');
        }

        const userId = context.user.id;
        let filter = { vehicleId };

        // Si se especifica askerId, filtra la conversación entre ese usuario y el dueño
        if (askerId) {
            filter.$or = [
                { fromUserId: userId, toUserId: askerId },
                { fromUserId: askerId, toUserId: userId },
            ];
        } else {
            // Sin askerId: trae todos los mensajes donde el usuario participa
            filter.$or = [
                { fromUserId: userId },
                { toUserId: userId },
            ];
        }

        const messages = await Question.find(filter).sort({ creationDate: 1 });

        // Enriquece con datos del remitente
        const userIds = [...new Set(messages.map(m => m.fromUserId))];
        const users = await User.find({ _id: { $in: userIds } }, 'name lastName');
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = { name: u.name, lastName: u.lastName }; });

        return messages.map(m => ({
            id: m._id.toString(),
            content: m.content,
            fromUserId: m.fromUserId,
            toUserId: m.toUserId,
            from: userMap[m.fromUserId] || null,
            creationDate: m.creationDate ? m.creationDate.toISOString() : null,
        }));
    },

    // --- questionsAsked --------------------------------------------------------
    questionsAsked: async (args, context) => {
        if (!context.user) {
            throw new Error('No autenticado. Incluye el token JWT en el header Authorization.');
        }

        const userId = context.user.id;

        // Vehículos donde el usuario hizo preguntas (no es el dueño)
        const myMessages = await Question.find({ fromUserId: userId });
        const vehicleIds = [...new Set(myMessages.map(m => m.vehicleId))];

        const results = [];

        for (const vehicleId of vehicleIds) {
            const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle || vehicle.ownerId === userId) continue;

            const thread = await Question.find({
                vehicleId,
                $or: [{ fromUserId: userId }, { toUserId: userId }],
            }).sort({ creationDate: 1 });

            if (!thread.length) continue;

            const lastMessage = thread[thread.length - 1];
            const pendingReply = lastMessage.fromUserId === userId;

            results.push({
                vehicle: {
                    id: vehicle._id.toString(),
                    brand: vehicle.brand,
                    model: vehicle.model,
                    year: vehicle.year,
                    price: vehicle.price,
                    status: vehicle.status,
                    plate: vehicle.plate,
                    ownerId: vehicle.ownerId,
                },
                messages: thread.map(m => ({
                    id: m._id.toString(),
                    content: m.content,
                    fromUserId: m.fromUserId,
                    toUserId: m.toUserId,
                    creationDate: m.creationDate ? m.creationDate.toISOString() : null,
                })),
                lastMessage: {
                    id: lastMessage._id.toString(),
                    content: lastMessage.content,
                    fromUserId: lastMessage.fromUserId,
                    toUserId: lastMessage.toUserId,
                    creationDate: lastMessage.creationDate ? lastMessage.creationDate.toISOString() : null,
                },
                pendingReply,
            });
        }

        return results;
    },

    // --- questionsReceived -----------------------------------------------------
    questionsReceived: async (args, context) => {
        if (!context.user) {
            throw new Error('No autenticado. Incluye el token JWT en el header Authorization.');
        }

        const userId = context.user.id;

        // Vehículos del usuario que tienen preguntas
        const myVehicles = await Vehicle.find({ ownerId: userId });
        const myVehicleIds = myVehicles.map(v => v._id.toString());

        const results = [];

        for (const vehicle of myVehicles) {
            const vehicleId = vehicle._id.toString();

            // Usuarios que preguntaron (no el dueño)
            const askerMessages = await Question.find({
                vehicleId,
                fromUserId: { $ne: userId },
            });

            const askerIds = [...new Set(askerMessages.map(m => m.fromUserId))];

            for (const askerId of askerIds) {
                const thread = await Question.find({
                    vehicleId,
                    $or: [
                        { fromUserId: userId, toUserId: askerId },
                        { fromUserId: askerId, toUserId: userId },
                    ],
                }).sort({ creationDate: 1 });

                if (!thread.length) continue;

                const lastMessage = thread[thread.length - 1];
                const pendingReply = lastMessage.fromUserId !== userId;

                const asker = await User.findById(askerId, 'name lastName');

                results.push({
                    vehicle: {
                        id: vehicle._id.toString(),
                        brand: vehicle.brand,
                        model: vehicle.model,
                        year: vehicle.year,
                        price: vehicle.price,
                        status: vehicle.status,
                        plate: vehicle.plate,
                        ownerId: vehicle.ownerId,
                    },
                    lastMessage: {
                        id: lastMessage._id.toString(),
                        content: lastMessage.content,
                        fromUserId: lastMessage.fromUserId,
                        toUserId: lastMessage.toUserId,
                        creationDate: lastMessage.creationDate ? lastMessage.creationDate.toISOString() : null,
                    },
                    pendingReply,
                    asker: asker ? {
                        id: asker._id.toString(),
                        name: asker.name,
                        lastName: asker.lastName,
                    } : null,
                });
            }
        }

        return results;
    },
};

module.exports = resolvers;