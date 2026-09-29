#import <React/RCTBridgeModule.h>

/**
 * React Native registration for CapriDeepLink.
 *
 * The implementation is Swift; the declaration lives here because it needs the
 * React headers and this target has no bridging header. See CapriAppGroup.m.
 */
@interface RCT_EXTERN_MODULE (CapriDeepLink, NSObject)

RCT_EXTERN_METHOD(takePendingLink:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
