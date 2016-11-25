/**
 * @fileoverview Rule that warns when an error condition has been checked but
 * branch doesn't log anything nor has any comments.
 * @author Ivan Erceg
 */

//	err parameter is checked then ignored in the branch
//	what is `err` parameter?
//		- first parameter in callback
//		- first parameter in .catch
