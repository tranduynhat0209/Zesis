export const ExceptionMessage = Object.freeze({
    UNKNOWN: {
        message: 'api error unknown',
        status: 101
    },
    USER_NOT_EXITS: {
        message: 'user not exits',
        status: 301
    },
    INVALID_PASSWORD: {
        message: 'invalid password',
        status: 302
    },
    INVALID_JWT: {
        message: 'invalid jwt',
        status: 303
    },
    INVALID_DATA: {
        message: 'invalid data',
        status: 304
    },
    USERNAME_EXITED: {
        message: 'username exited',
        status: 305
    },
    INVALID_LENGTH_USERNAME: {
        message: `username's length must be less than 20`,
        status: 306
    },
    INVALID_LENGTH_PASSWORD: {
        message: `password's length must be less than 20`,
        status: 307
    },
    UNAUTHORIZED: {
        message: 'unauthorized',
        status: 401
    }
})