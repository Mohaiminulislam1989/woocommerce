const TYPES = {
	ADD_CURRENTLY_RUNNING: 'ADD_CURRENTLY_RUNNING',
	REMOVE_CURRENTLY_RUNNING: 'REMOVE_CURRENTLY_RUNNING',
	ADD_MESSAGE: 'ADD_MESSAGE',
	UPDATE_MESSAGE: 'UPDATE_MESSAGE',
	REMOVE_MESSAGE: 'REMOVE_MESSAGE',
	ADD_COMMAND_PARAMS: 'ADD_COMMAND_PARAMS',
	SET_CRON_JOBS: 'SET_CRON_JOBS',
	IS_EMAIL_DISABLED: 'IS_EMAIL_DISABLED',
	SET_DB_UPDATE_VERSIONS: 'SET_DB_UPDATE_VERSIONS',
	SET_LOGGING_LEVELS: 'SET_LOGGING_LEVELS',
	UPDATE_BLOCK_TEMPLATE_LOGGING_THRESHOLD:
		'UPDATE_BLOCK_TEMPLATE_LOGGING_THRESHOLD',
	UPDATE_COMING_SOON_MODE: 'UPDATE_COMING_SOON_MODE',
} as const;

export default TYPES;
