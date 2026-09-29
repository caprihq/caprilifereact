#import <React/RCTBridgeModule.h>

/**
 * React Native registration for CapriPush.
 *
 * The implementation is Swift; the declaration lives here because it needs the
 * React headers and this target has no bridging header. See CapriAppGroup.m.
 */
@interface RCT_EXTERN_MODULE (CapriPush, NSObject)

RCT_EXTERN_METHOD(getToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
