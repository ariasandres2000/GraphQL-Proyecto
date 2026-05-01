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

    type MessageFrom {
    
        name: String
        lastName: String

    }

    type Message {
    
        id: String
        content: String
        fromUserId: String
        toUserId: String
        from: MessageFrom
        creationDate: String

    }

    type QuestionThread{
    
        vehicle: Vehicle
        messages: [Message]
        lastMessage: Message
        pendingReply: Boolean
        asker: User

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

        questionThread(vehicleId: String!, askerId: String): [Message]

        questionsAsked:[QuestionThread]

        questionsReceived: [QuestionThread]

    }
`);

module.exports = schema;