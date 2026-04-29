const { buildSchema } = require('graphql');

const schema = buildSchema(`
    
    type Owner {

        id: String
        name: String
        lastName: String
        email: String

    }

    type Vehicle {

        id: String
        brand: String
        model: String
        year: Int
        price: Float
        status: String
        plate: String
        ownerId: String
        owner: Owner
    
    }
    
    type VehicleList {

        total: Int
        page: Int
        totalPages: Int
        limit: Int
        vehicles: [Vehicle]
    
    }
    
    type User {
    
        id: String
        name: String
        lastName: String
        email: String
    
    }

    type Query {
    
        vehicles(
        
            brand: String
            model: String
            minYear: Int
            maxYear: Int
            minPrice: Float
            maxPrice: Float
            status: String
            page: Int
            limit: Int
            
        ): VehicleList

        vehicle(id: String!): Vehicle

        me: User

        myVehicles: [Vehicle]

    }
`);

module.exports = schema;