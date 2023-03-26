// Import third-party packages
import log4js from "log4js" // Does not support new import syntax

// Create a logger for this file
const log = log4js.getLogger( "helpers" )

// Ensures a given environment variable is set
export const ensureEnvironmentVariable = ( name: string ) => {
	if ( process.env[ name ] == undefined ) {
		log.fatal( "Environment variable '%s' is not set!", name )
		process.exit( 1 )
	}

	return process.env[ name ]!
}
