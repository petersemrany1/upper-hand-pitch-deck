(()=>{var j5=2;var f5=2;var h5=1,b5=2;var x5=4;var g5=1000;var J8="srgb";class P6{addEventListener(J,$){if(this._listeners===void 0)this._listeners={};let Q=this._listeners;if(Q[J]===void 0)Q[J]=[];if(Q[J].indexOf($)===-1)Q[J].push($)}hasEventListener(J,$){if(this._listeners===void 0)return!1;let Q=this._listeners;return Q[J]!==void 0&&Q[J].indexOf($)!==-1}removeEventListener(J,$){if(this._listeners===void 0)return;let Z=this._listeners[J];if(Z!==void 0){let W=Z.indexOf($);if(W!==-1)Z.splice(W,1)}}dispatchEvent(J){if(this._listeners===void 0)return;let Q=this._listeners[J.type];if(Q!==void 0){J.target=this;let Z=Q.slice(0);for(let W=0,Y=Z.length;W<Y;W++)Z[W].call(this,J);J.target=null}}}var N0=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var M8=Math.PI/180,t8=180/Math.PI;function R6(){let J=Math.random()*4294967295|0,$=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(N0[J&255]+N0[J>>8&255]+N0[J>>16&255]+N0[J>>24&255]+"-"+N0[$&255]+N0[$>>8&255]+"-"+N0[$>>16&15|64]+N0[$>>24&255]+"-"+N0[Q&63|128]+N0[Q>>8&255]+"-"+N0[Q>>16&255]+N0[Q>>24&255]+N0[Z&255]+N0[Z>>8&255]+N0[Z>>16&255]+N0[Z>>24&255]).toLowerCase()}function M0(J,$,Q){return Math.max($,Math.min(Q,J))}function f$(J,$){return(J%$+$)%$}function B8(J,$,Q){return(1-Q)*J+Q*$}function d0(J,$){switch($.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("Invalid component type.")}}function J0(J,$){switch($.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("Invalid component type.")}}class MJ{constructor(J=0,$=0){MJ.prototype.isVector2=!0,this.x=J,this.y=$}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,$){return this.x=J,this.y=$,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,$){switch(J){case 0:this.x=$;break;case 1:this.y=$;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,$){return this.x=J.x+$.x,this.y=J.y+$.y,this}addScaledVector(J,$){return this.x+=J.x*$,this.y+=J.y*$,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,$){return this.x=J.x-$.x,this.y=J.y-$.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let $=this.x,Q=this.y,Z=J.elements;return this.x=Z[0]*$+Z[3]*Q+Z[6],this.y=Z[1]*$+Z[4]*Q+Z[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,$){return this.x=Math.max(J.x,Math.min($.x,this.x)),this.y=Math.max(J.y,Math.min($.y,this.y)),this}clampScalar(J,$){return this.x=Math.max(J,Math.min($,this.x)),this.y=Math.max(J,Math.min($,this.y)),this}clampLength(J,$){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(Math.max(J,Math.min($,Q)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let $=Math.sqrt(this.lengthSq()*J.lengthSq());if($===0)return Math.PI/2;let Q=this.dot(J)/$;return Math.acos(M0(Q,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let $=this.x-J.x,Q=this.y-J.y;return $*$+Q*Q}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,$){return this.x+=(J.x-this.x)*$,this.y+=(J.y-this.y)*$,this}lerpVectors(J,$,Q){return this.x=J.x+($.x-J.x)*Q,this.y=J.y+($.y-J.y)*Q,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,$=0){return this.x=J[$],this.y=J[$+1],this}toArray(J=[],$=0){return J[$]=this.x,J[$+1]=this.y,J}fromBufferAttribute(J,$){return this.x=J.getX($),this.y=J.getY($),this}rotateAround(J,$){let Q=Math.cos($),Z=Math.sin($),W=this.x-J.x,Y=this.y-J.y;return this.x=W*Q-Y*Z+J.x,this.y=W*Z+Y*Q+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class gJ{constructor(J,$,Q,Z,W,Y,K,X,G){if(gJ.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,$,Q,Z,W,Y,K,X,G)}set(J,$,Q,Z,W,Y,K,X,G){let U=this.elements;return U[0]=J,U[1]=Z,U[2]=K,U[3]=$,U[4]=W,U[5]=X,U[6]=Q,U[7]=Y,U[8]=G,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let $=this.elements,Q=J.elements;return $[0]=Q[0],$[1]=Q[1],$[2]=Q[2],$[3]=Q[3],$[4]=Q[4],$[5]=Q[5],$[6]=Q[6],$[7]=Q[7],$[8]=Q[8],this}extractBasis(J,$,Q){return J.setFromMatrix3Column(this,0),$.setFromMatrix3Column(this,1),Q.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let $=J.elements;return this.set($[0],$[4],$[8],$[1],$[5],$[9],$[2],$[6],$[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,$){let Q=J.elements,Z=$.elements,W=this.elements,Y=Q[0],K=Q[3],X=Q[6],G=Q[1],U=Q[4],V=Q[7],H=Q[2],q=Q[5],D=Q[8],A=Z[0],O=Z[3],F=Z[6],E=Z[1],_=Z[4],N=Z[7],C=Z[2],f=Z[5],k=Z[8];return W[0]=Y*A+K*E+X*C,W[3]=Y*O+K*_+X*f,W[6]=Y*F+K*N+X*k,W[1]=G*A+U*E+V*C,W[4]=G*O+U*_+V*f,W[7]=G*F+U*N+V*k,W[2]=H*A+q*E+D*C,W[5]=H*O+q*_+D*f,W[8]=H*F+q*N+D*k,this}multiplyScalar(J){let $=this.elements;return $[0]*=J,$[3]*=J,$[6]*=J,$[1]*=J,$[4]*=J,$[7]*=J,$[2]*=J,$[5]*=J,$[8]*=J,this}determinant(){let J=this.elements,$=J[0],Q=J[1],Z=J[2],W=J[3],Y=J[4],K=J[5],X=J[6],G=J[7],U=J[8];return $*Y*U-$*K*G-Q*W*U+Q*K*X+Z*W*G-Z*Y*X}invert(){let J=this.elements,$=J[0],Q=J[1],Z=J[2],W=J[3],Y=J[4],K=J[5],X=J[6],G=J[7],U=J[8],V=U*Y-K*G,H=K*X-U*W,q=G*W-Y*X,D=$*V+Q*H+Z*q;if(D===0)return this.set(0,0,0,0,0,0,0,0,0);let A=1/D;return J[0]=V*A,J[1]=(Z*G-U*Q)*A,J[2]=(K*Q-Z*Y)*A,J[3]=H*A,J[4]=(U*$-Z*X)*A,J[5]=(Z*W-K*$)*A,J[6]=q*A,J[7]=(Q*X-G*$)*A,J[8]=(Y*$-Q*W)*A,this}transpose(){let J,$=this.elements;return J=$[1],$[1]=$[3],$[3]=J,J=$[2],$[2]=$[6],$[6]=J,J=$[5],$[5]=$[7],$[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let $=this.elements;return J[0]=$[0],J[1]=$[3],J[2]=$[6],J[3]=$[1],J[4]=$[4],J[5]=$[7],J[6]=$[2],J[7]=$[5],J[8]=$[8],this}setUvTransform(J,$,Q,Z,W,Y,K){let X=Math.cos(W),G=Math.sin(W);return this.set(Q*X,Q*G,-Q*(X*Y+G*K)+Y+J,-Z*G,Z*X,-Z*(-G*Y+X*K)+K+$,0,0,1),this}scale(J,$){return this.premultiply(A8.makeScale(J,$)),this}rotate(J){return this.premultiply(A8.makeRotation(-J)),this}translate(J,$){return this.premultiply(A8.makeTranslation(J,$)),this}makeTranslation(J,$){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,$,0,0,1);return this}makeRotation(J){let $=Math.cos(J),Q=Math.sin(J);return this.set($,-Q,0,Q,$,0,0,0,1),this}makeScale(J,$){return this.set(J,0,0,0,$,0,0,0,1),this}equals(J){let $=this.elements,Q=J.elements;for(let Z=0;Z<9;Z++)if($[Z]!==Q[Z])return!1;return!0}fromArray(J,$=0){for(let Q=0;Q<9;Q++)this.elements[Q]=J[Q+$];return this}toArray(J=[],$=0){let Q=this.elements;return J[$]=Q[0],J[$+1]=Q[1],J[$+2]=Q[2],J[$+3]=Q[3],J[$+4]=Q[4],J[$+5]=Q[5],J[$+6]=Q[6],J[$+7]=Q[7],J[$+8]=Q[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var A8=new gJ;function p5(J){for(let $=J.length-1;$>=0;--$)if(J[$]>=65535)return!0;return!1}function t7(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function h$(){let J=t7("canvas");return J.style.display="block",J}var h9={};function N7(J){if(J in h9)return;h9[J]=!0,console.warn(J)}function b$(J,$,Q){return new Promise(function(Z,W){function Y(){switch(J.clientWaitSync($,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:W();break;case J.TIMEOUT_EXPIRED:setTimeout(Y,Q);break;default:Z()}}setTimeout(Y,Q)})}function x$(J){let $=J.elements;$[2]=0.5*$[2]+0.5*$[3],$[6]=0.5*$[6]+0.5*$[7],$[10]=0.5*$[10]+0.5*$[11],$[14]=0.5*$[14]+0.5*$[15]}function g$(J){let $=J.elements;if($[11]===-1)$[10]=-$[10]-1,$[14]=-$[14];else $[10]=-$[10],$[14]=-$[14]+1}var oJ={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(J,$,Q){if(this.enabled===!1||$===Q||!$||!Q)return J;if(this.spaces[$].transfer==="srgb")J.r=$6(J.r),J.g=$6(J.g),J.b=$6(J.b);if(this.spaces[$].primaries!==this.spaces[Q].primaries)J.applyMatrix3(this.spaces[$].toXYZ),J.applyMatrix3(this.spaces[Q].fromXYZ);if(this.spaces[Q].transfer==="srgb")J.r=e6(J.r),J.g=e6(J.g),J.b=e6(J.b);return J},fromWorkingColorSpace:function(J,$){return this.convert(J,this.workingColorSpace,$)},toWorkingColorSpace:function(J,$){return this.convert(J,$,this.workingColorSpace)},getPrimaries:function(J){return this.spaces[J].primaries},getTransfer:function(J){if(J==="")return"linear";return this.spaces[J].transfer},getLuminanceCoefficients:function(J,$=this.workingColorSpace){return J.fromArray(this.spaces[$].luminanceCoefficients)},define:function(J){Object.assign(this.spaces,J)},_getMatrix:function(J,$,Q){return J.copy(this.spaces[$].toXYZ).multiply(this.spaces[Q].fromXYZ)},_getDrawingBufferColorSpace:function(J){return this.spaces[J].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(J=this.workingColorSpace){return this.spaces[J].workingColorSpaceConfig.unpackColorSpace}};function $6(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function e6(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var b9=[0.64,0.33,0.3,0.6,0.15,0.06],x9=[0.2126,0.7152,0.0722],g9=[0.3127,0.329],p9=new gJ().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),m9=new gJ().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);oJ.define({["srgb-linear"]:{primaries:b9,whitePoint:g9,transfer:"linear",toXYZ:p9,fromXYZ:m9,luminanceCoefficients:x9,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:b9,whitePoint:g9,transfer:"srgb",toXYZ:p9,fromXYZ:m9,luminanceCoefficients:x9,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}});var f6;class m5{static getDataURL(J){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(f6===void 0)f6=t7("canvas");f6.width=J.width,f6.height=J.height;let Q=f6.getContext("2d");if(J instanceof ImageData)Q.putImageData(J,0,0);else Q.drawImage(J,0,0,J.width,J.height);$=f6}if($.width>2048||$.height>2048)return console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",J),$.toDataURL("image/jpeg",0.6);else return $.toDataURL("image/png")}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let $=t7("canvas");$.width=J.width,$.height=J.height;let Q=$.getContext("2d");Q.drawImage(J,0,0,J.width,J.height);let Z=Q.getImageData(0,0,J.width,J.height),W=Z.data;for(let Y=0;Y<W.length;Y++)W[Y]=$6(W[Y]/255)*255;return Q.putImageData(Z,0,0),$}else if(J.data){let $=J.data.slice(0);for(let Q=0;Q<$.length;Q++)if($ instanceof Uint8Array||$ instanceof Uint8ClampedArray)$[Q]=Math.floor($6($[Q]/255)*255);else $[Q]=$6($[Q]);return{data:$,width:J.width,height:J.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var p$=0;class Q9{constructor(J=null){this.isSource=!0,Object.defineProperty(this,"id",{value:p$++}),this.uuid=R6(),this.data=J,this.dataReady=!0,this.version=0}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let $=J===void 0||typeof J==="string";if(!$&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let Q={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let W;if(Array.isArray(Z)){W=[];for(let Y=0,K=Z.length;Y<K;Y++)if(Z[Y].isDataTexture)W.push(L8(Z[Y].image));else W.push(L8(Z[Y]))}else W=L8(Z);Q.url=W}if(!$)J.images[this.uuid]=Q;return Q}}function L8(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return m5.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return console.warn("THREE.Texture: Unable to serialize Texture."),{}}var m$=0;class _0 extends P6{constructor(J=_0.DEFAULT_IMAGE,$=_0.DEFAULT_MAPPING,Q=1001,Z=1001,W=1006,Y=1008,K=1023,X=1009,G=_0.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:m$++}),this.uuid=R6(),this.name="",this.source=new Q9(J),this.mipmaps=[],this.mapping=$,this.channel=0,this.wrapS=Q,this.wrapT=Z,this.magFilter=W,this.minFilter=Y,this.anisotropy=G,this.format=K,this.internalFormat=null,this.type=X,this.offset=new MJ(0,0),this.repeat=new MJ(1,1),this.center=new MJ(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new gJ,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(J=null){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}toJSON(J){let $=J===void 0||typeof J==="string";if(!$&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let Q={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)Q.userData=this.userData;if(!$)J.textures[this.uuid]=Q;return Q}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}_0.DEFAULT_IMAGE=null;_0.DEFAULT_MAPPING=300;_0.DEFAULT_ANISOTROPY=1;class U0{constructor(J=0,$=0,Q=0,Z=1){U0.prototype.isVector4=!0,this.x=J,this.y=$,this.z=Q,this.w=Z}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,$,Q,Z){return this.x=J,this.y=$,this.z=Q,this.w=Z,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,$){switch(J){case 0:this.x=$;break;case 1:this.y=$;break;case 2:this.z=$;break;case 3:this.w=$;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,$){return this.x=J.x+$.x,this.y=J.y+$.y,this.z=J.z+$.z,this.w=J.w+$.w,this}addScaledVector(J,$){return this.x+=J.x*$,this.y+=J.y*$,this.z+=J.z*$,this.w+=J.w*$,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,$){return this.x=J.x-$.x,this.y=J.y-$.y,this.z=J.z-$.z,this.w=J.w-$.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let $=this.x,Q=this.y,Z=this.z,W=this.w,Y=J.elements;return this.x=Y[0]*$+Y[4]*Q+Y[8]*Z+Y[12]*W,this.y=Y[1]*$+Y[5]*Q+Y[9]*Z+Y[13]*W,this.z=Y[2]*$+Y[6]*Q+Y[10]*Z+Y[14]*W,this.w=Y[3]*$+Y[7]*Q+Y[11]*Z+Y[15]*W,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let $=Math.sqrt(1-J.w*J.w);if($<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/$,this.y=J.y/$,this.z=J.z/$;return this}setAxisAngleFromRotationMatrix(J){let $,Q,Z,W,Y=0.01,K=0.1,X=J.elements,G=X[0],U=X[4],V=X[8],H=X[1],q=X[5],D=X[9],A=X[2],O=X[6],F=X[10];if(Math.abs(U-H)<0.01&&Math.abs(V-A)<0.01&&Math.abs(D-O)<0.01){if(Math.abs(U+H)<0.1&&Math.abs(V+A)<0.1&&Math.abs(D+O)<0.1&&Math.abs(G+q+F-3)<0.1)return this.set(1,0,0,0),this;$=Math.PI;let _=(G+1)/2,N=(q+1)/2,C=(F+1)/2,f=(U+H)/4,k=(V+A)/4,w=(D+O)/4;if(_>N&&_>C)if(_<0.01)Q=0,Z=0.707106781,W=0.707106781;else Q=Math.sqrt(_),Z=f/Q,W=k/Q;else if(N>C)if(N<0.01)Q=0.707106781,Z=0,W=0.707106781;else Z=Math.sqrt(N),Q=f/Z,W=w/Z;else if(C<0.01)Q=0.707106781,Z=0.707106781,W=0;else W=Math.sqrt(C),Q=k/W,Z=w/W;return this.set(Q,Z,W,$),this}let E=Math.sqrt((O-D)*(O-D)+(V-A)*(V-A)+(H-U)*(H-U));if(Math.abs(E)<0.001)E=1;return this.x=(O-D)/E,this.y=(V-A)/E,this.z=(H-U)/E,this.w=Math.acos((G+q+F-1)/2),this}setFromMatrixPosition(J){let $=J.elements;return this.x=$[12],this.y=$[13],this.z=$[14],this.w=$[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,$){return this.x=Math.max(J.x,Math.min($.x,this.x)),this.y=Math.max(J.y,Math.min($.y,this.y)),this.z=Math.max(J.z,Math.min($.z,this.z)),this.w=Math.max(J.w,Math.min($.w,this.w)),this}clampScalar(J,$){return this.x=Math.max(J,Math.min($,this.x)),this.y=Math.max(J,Math.min($,this.y)),this.z=Math.max(J,Math.min($,this.z)),this.w=Math.max(J,Math.min($,this.w)),this}clampLength(J,$){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(Math.max(J,Math.min($,Q)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,$){return this.x+=(J.x-this.x)*$,this.y+=(J.y-this.y)*$,this.z+=(J.z-this.z)*$,this.w+=(J.w-this.w)*$,this}lerpVectors(J,$,Q){return this.x=J.x+($.x-J.x)*Q,this.y=J.y+($.y-J.y)*Q,this.z=J.z+($.z-J.z)*Q,this.w=J.w+($.w-J.w)*Q,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,$=0){return this.x=J[$],this.y=J[$+1],this.z=J[$+2],this.w=J[$+3],this}toArray(J=[],$=0){return J[$]=this.x,J[$+1]=this.y,J[$+2]=this.z,J[$+3]=this.w,J}fromBufferAttribute(J,$){return this.x=J.getX($),this.y=J.getY($),this.z=J.getZ($),this.w=J.getW($),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class u5 extends P6{constructor(J=1,$=1,Q={}){super();this.isRenderTarget=!0,this.width=J,this.height=$,this.depth=1,this.scissor=new U0(0,0,J,$),this.scissorTest=!1,this.viewport=new U0(0,0,J,$);let Z={width:J,height:$,depth:1};Q=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},Q);let W=new _0(Z,Q.mapping,Q.wrapS,Q.wrapT,Q.magFilter,Q.minFilter,Q.format,Q.type,Q.anisotropy,Q.colorSpace);W.flipY=!1,W.generateMipmaps=Q.generateMipmaps,W.internalFormat=Q.internalFormat,this.textures=[];let Y=Q.count;for(let K=0;K<Y;K++)this.textures[K]=W.clone(),this.textures[K].isRenderTargetTexture=!0;this.depthBuffer=Q.depthBuffer,this.stencilBuffer=Q.stencilBuffer,this.resolveDepthBuffer=Q.resolveDepthBuffer,this.resolveStencilBuffer=Q.resolveStencilBuffer,this.depthTexture=Q.depthTexture,this.samples=Q.samples}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}setSize(J,$,Q=1){if(this.width!==J||this.height!==$||this.depth!==Q){this.width=J,this.height=$,this.depth=Q;for(let Z=0,W=this.textures.length;Z<W;Z++)this.textures[Z].image.width=J,this.textures[Z].image.height=$,this.textures[Z].image.depth=Q;this.dispose()}this.viewport.set(0,0,J,$),this.scissor.set(0,0,J,$)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,Z=J.textures.length;Q<Z;Q++)this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0;let $=Object.assign({},J.texture.image);if(this.texture.source=new Q9($),this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,J.depthTexture!==null)this.depthTexture=J.depthTexture.clone();return this.samples=J.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class N6 extends u5{constructor(J=1,$=1,Q={}){super(J,$,Q);this.isWebGLRenderTarget=!0}}class Z9 extends _0{constructor(J=null,$=1,Q=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:$,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class l5 extends _0{constructor(J=null,$=1,Q=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:$,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class S6{constructor(J=0,$=0,Q=0,Z=1){this.isQuaternion=!0,this._x=J,this._y=$,this._z=Q,this._w=Z}static slerpFlat(J,$,Q,Z,W,Y,K){let X=Q[Z+0],G=Q[Z+1],U=Q[Z+2],V=Q[Z+3],H=W[Y+0],q=W[Y+1],D=W[Y+2],A=W[Y+3];if(K===0){J[$+0]=X,J[$+1]=G,J[$+2]=U,J[$+3]=V;return}if(K===1){J[$+0]=H,J[$+1]=q,J[$+2]=D,J[$+3]=A;return}if(V!==A||X!==H||G!==q||U!==D){let O=1-K,F=X*H+G*q+U*D+V*A,E=F>=0?1:-1,_=1-F*F;if(_>Number.EPSILON){let C=Math.sqrt(_),f=Math.atan2(C,F*E);O=Math.sin(O*f)/C,K=Math.sin(K*f)/C}let N=K*E;if(X=X*O+H*N,G=G*O+q*N,U=U*O+D*N,V=V*O+A*N,O===1-K){let C=1/Math.sqrt(X*X+G*G+U*U+V*V);X*=C,G*=C,U*=C,V*=C}}J[$]=X,J[$+1]=G,J[$+2]=U,J[$+3]=V}static multiplyQuaternionsFlat(J,$,Q,Z,W,Y){let K=Q[Z],X=Q[Z+1],G=Q[Z+2],U=Q[Z+3],V=W[Y],H=W[Y+1],q=W[Y+2],D=W[Y+3];return J[$]=K*D+U*V+X*q-G*H,J[$+1]=X*D+U*H+G*V-K*q,J[$+2]=G*D+U*q+K*H-X*V,J[$+3]=U*D-K*V-X*H-G*q,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,$,Q,Z){return this._x=J,this._y=$,this._z=Q,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,$=!0){let{_x:Q,_y:Z,_z:W,_order:Y}=J,K=Math.cos,X=Math.sin,G=K(Q/2),U=K(Z/2),V=K(W/2),H=X(Q/2),q=X(Z/2),D=X(W/2);switch(Y){case"XYZ":this._x=H*U*V+G*q*D,this._y=G*q*V-H*U*D,this._z=G*U*D+H*q*V,this._w=G*U*V-H*q*D;break;case"YXZ":this._x=H*U*V+G*q*D,this._y=G*q*V-H*U*D,this._z=G*U*D-H*q*V,this._w=G*U*V+H*q*D;break;case"ZXY":this._x=H*U*V-G*q*D,this._y=G*q*V+H*U*D,this._z=G*U*D+H*q*V,this._w=G*U*V-H*q*D;break;case"ZYX":this._x=H*U*V-G*q*D,this._y=G*q*V+H*U*D,this._z=G*U*D-H*q*V,this._w=G*U*V+H*q*D;break;case"YZX":this._x=H*U*V+G*q*D,this._y=G*q*V+H*U*D,this._z=G*U*D-H*q*V,this._w=G*U*V-H*q*D;break;case"XZY":this._x=H*U*V-G*q*D,this._y=G*q*V-H*U*D,this._z=G*U*D+H*q*V,this._w=G*U*V+H*q*D;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+Y)}if($===!0)this._onChangeCallback();return this}setFromAxisAngle(J,$){let Q=$/2,Z=Math.sin(Q);return this._x=J.x*Z,this._y=J.y*Z,this._z=J.z*Z,this._w=Math.cos(Q),this._onChangeCallback(),this}setFromRotationMatrix(J){let $=J.elements,Q=$[0],Z=$[4],W=$[8],Y=$[1],K=$[5],X=$[9],G=$[2],U=$[6],V=$[10],H=Q+K+V;if(H>0){let q=0.5/Math.sqrt(H+1);this._w=0.25/q,this._x=(U-X)*q,this._y=(W-G)*q,this._z=(Y-Z)*q}else if(Q>K&&Q>V){let q=2*Math.sqrt(1+Q-K-V);this._w=(U-X)/q,this._x=0.25*q,this._y=(Z+Y)/q,this._z=(W+G)/q}else if(K>V){let q=2*Math.sqrt(1+K-Q-V);this._w=(W-G)/q,this._x=(Z+Y)/q,this._y=0.25*q,this._z=(X+U)/q}else{let q=2*Math.sqrt(1+V-Q-K);this._w=(Y-Z)/q,this._x=(W+G)/q,this._y=(X+U)/q,this._z=0.25*q}return this._onChangeCallback(),this}setFromUnitVectors(J,$){let Q=J.dot($)+1;if(Q<Number.EPSILON)if(Q=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=Q;else this._x=0,this._y=-J.z,this._z=J.y,this._w=Q;else this._x=J.y*$.z-J.z*$.y,this._y=J.z*$.x-J.x*$.z,this._z=J.x*$.y-J.y*$.x,this._w=Q;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(M0(this.dot(J),-1,1)))}rotateTowards(J,$){let Q=this.angleTo(J);if(Q===0)return this;let Z=Math.min(1,$/Q);return this.slerp(J,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,$){let{_x:Q,_y:Z,_z:W,_w:Y}=J,K=$._x,X=$._y,G=$._z,U=$._w;return this._x=Q*U+Y*K+Z*G-W*X,this._y=Z*U+Y*X+W*K-Q*G,this._z=W*U+Y*G+Q*X-Z*K,this._w=Y*U-Q*K-Z*X-W*G,this._onChangeCallback(),this}slerp(J,$){if($===0)return this;if($===1)return this.copy(J);let Q=this._x,Z=this._y,W=this._z,Y=this._w,K=Y*J._w+Q*J._x+Z*J._y+W*J._z;if(K<0)this._w=-J._w,this._x=-J._x,this._y=-J._y,this._z=-J._z,K=-K;else this.copy(J);if(K>=1)return this._w=Y,this._x=Q,this._y=Z,this._z=W,this;let X=1-K*K;if(X<=Number.EPSILON){let q=1-$;return this._w=q*Y+$*this._w,this._x=q*Q+$*this._x,this._y=q*Z+$*this._y,this._z=q*W+$*this._z,this.normalize(),this}let G=Math.sqrt(X),U=Math.atan2(G,K),V=Math.sin((1-$)*U)/G,H=Math.sin($*U)/G;return this._w=Y*V+this._w*H,this._x=Q*V+this._x*H,this._y=Z*V+this._y*H,this._z=W*V+this._z*H,this._onChangeCallback(),this}slerpQuaternions(J,$,Q){return this.copy(J).slerp($,Q)}random(){let J=2*Math.PI*Math.random(),$=2*Math.PI*Math.random(),Q=Math.random(),Z=Math.sqrt(1-Q),W=Math.sqrt(Q);return this.set(Z*Math.sin(J),Z*Math.cos(J),W*Math.sin($),W*Math.cos($))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,$=0){return this._x=J[$],this._y=J[$+1],this._z=J[$+2],this._w=J[$+3],this._onChangeCallback(),this}toArray(J=[],$=0){return J[$]=this._x,J[$+1]=this._y,J[$+2]=this._z,J[$+3]=this._w,J}fromBufferAttribute(J,$){return this._x=J.getX($),this._y=J.getY($),this._z=J.getZ($),this._w=J.getW($),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class T{constructor(J=0,$=0,Q=0){T.prototype.isVector3=!0,this.x=J,this.y=$,this.z=Q}set(J,$,Q){if(Q===void 0)Q=this.z;return this.x=J,this.y=$,this.z=Q,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,$){switch(J){case 0:this.x=$;break;case 1:this.y=$;break;case 2:this.z=$;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,$){return this.x=J.x+$.x,this.y=J.y+$.y,this.z=J.z+$.z,this}addScaledVector(J,$){return this.x+=J.x*$,this.y+=J.y*$,this.z+=J.z*$,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,$){return this.x=J.x-$.x,this.y=J.y-$.y,this.z=J.z-$.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,$){return this.x=J.x*$.x,this.y=J.y*$.y,this.z=J.z*$.z,this}applyEuler(J){return this.applyQuaternion(u9.setFromEuler(J))}applyAxisAngle(J,$){return this.applyQuaternion(u9.setFromAxisAngle(J,$))}applyMatrix3(J){let $=this.x,Q=this.y,Z=this.z,W=J.elements;return this.x=W[0]*$+W[3]*Q+W[6]*Z,this.y=W[1]*$+W[4]*Q+W[7]*Z,this.z=W[2]*$+W[5]*Q+W[8]*Z,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let $=this.x,Q=this.y,Z=this.z,W=J.elements,Y=1/(W[3]*$+W[7]*Q+W[11]*Z+W[15]);return this.x=(W[0]*$+W[4]*Q+W[8]*Z+W[12])*Y,this.y=(W[1]*$+W[5]*Q+W[9]*Z+W[13])*Y,this.z=(W[2]*$+W[6]*Q+W[10]*Z+W[14])*Y,this}applyQuaternion(J){let $=this.x,Q=this.y,Z=this.z,W=J.x,Y=J.y,K=J.z,X=J.w,G=2*(Y*Z-K*Q),U=2*(K*$-W*Z),V=2*(W*Q-Y*$);return this.x=$+X*G+Y*V-K*U,this.y=Q+X*U+K*G-W*V,this.z=Z+X*V+W*U-Y*G,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let $=this.x,Q=this.y,Z=this.z,W=J.elements;return this.x=W[0]*$+W[4]*Q+W[8]*Z,this.y=W[1]*$+W[5]*Q+W[9]*Z,this.z=W[2]*$+W[6]*Q+W[10]*Z,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,$){return this.x=Math.max(J.x,Math.min($.x,this.x)),this.y=Math.max(J.y,Math.min($.y,this.y)),this.z=Math.max(J.z,Math.min($.z,this.z)),this}clampScalar(J,$){return this.x=Math.max(J,Math.min($,this.x)),this.y=Math.max(J,Math.min($,this.y)),this.z=Math.max(J,Math.min($,this.z)),this}clampLength(J,$){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(Math.max(J,Math.min($,Q)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,$){return this.x+=(J.x-this.x)*$,this.y+=(J.y-this.y)*$,this.z+=(J.z-this.z)*$,this}lerpVectors(J,$,Q){return this.x=J.x+($.x-J.x)*Q,this.y=J.y+($.y-J.y)*Q,this.z=J.z+($.z-J.z)*Q,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,$){let{x:Q,y:Z,z:W}=J,Y=$.x,K=$.y,X=$.z;return this.x=Z*X-W*K,this.y=W*Y-Q*X,this.z=Q*K-Z*Y,this}projectOnVector(J){let $=J.lengthSq();if($===0)return this.set(0,0,0);let Q=J.dot(this)/$;return this.copy(J).multiplyScalar(Q)}projectOnPlane(J){return _8.copy(this).projectOnVector(J),this.sub(_8)}reflect(J){return this.sub(_8.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let $=Math.sqrt(this.lengthSq()*J.lengthSq());if($===0)return Math.PI/2;let Q=this.dot(J)/$;return Math.acos(M0(Q,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let $=this.x-J.x,Q=this.y-J.y,Z=this.z-J.z;return $*$+Q*Q+Z*Z}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,$,Q){let Z=Math.sin($)*J;return this.x=Z*Math.sin(Q),this.y=Math.cos($)*J,this.z=Z*Math.cos(Q),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,$,Q){return this.x=J*Math.sin($),this.y=Q,this.z=J*Math.cos($),this}setFromMatrixPosition(J){let $=J.elements;return this.x=$[12],this.y=$[13],this.z=$[14],this}setFromMatrixScale(J){let $=this.setFromMatrixColumn(J,0).length(),Q=this.setFromMatrixColumn(J,1).length(),Z=this.setFromMatrixColumn(J,2).length();return this.x=$,this.y=Q,this.z=Z,this}setFromMatrixColumn(J,$){return this.fromArray(J.elements,$*4)}setFromMatrix3Column(J,$){return this.fromArray(J.elements,$*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,$=0){return this.x=J[$],this.y=J[$+1],this.z=J[$+2],this}toArray(J=[],$=0){return J[$]=this.x,J[$+1]=this.y,J[$+2]=this.z,J}fromBufferAttribute(J,$){return this.x=J.getX($),this.y=J.getY($),this.z=J.getZ($),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,$=Math.random()*2-1,Q=Math.sqrt(1-$*$);return this.x=Q*Math.cos(J),this.y=$,this.z=Q*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var _8=new T,u9=new S6;class O6{constructor(J=new T(1/0,1/0,1/0),$=new T(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=$}set(J,$){return this.min.copy(J),this.max.copy($),this}setFromArray(J){this.makeEmpty();for(let $=0,Q=J.length;$<Q;$+=3)this.expandByPoint(h0.fromArray(J,$));return this}setFromBufferAttribute(J){this.makeEmpty();for(let $=0,Q=J.count;$<Q;$++)this.expandByPoint(h0.fromBufferAttribute(J,$));return this}setFromPoints(J){this.makeEmpty();for(let $=0,Q=J.length;$<Q;$++)this.expandByPoint(J[$]);return this}setFromCenterAndSize(J,$){let Q=h0.copy($).multiplyScalar(0.5);return this.min.copy(J).sub(Q),this.max.copy(J).add(Q),this}setFromObject(J,$=!1){return this.makeEmpty(),this.expandByObject(J,$)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,$=!1){J.updateWorldMatrix(!1,!1);let Q=J.geometry;if(Q!==void 0){let W=Q.getAttribute("position");if($===!0&&W!==void 0&&J.isInstancedMesh!==!0)for(let Y=0,K=W.count;Y<K;Y++){if(J.isMesh===!0)J.getVertexPosition(Y,h0);else h0.fromBufferAttribute(W,Y);h0.applyMatrix4(J.matrixWorld),this.expandByPoint(h0)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();C7.copy(J.boundingBox)}else{if(Q.boundingBox===null)Q.computeBoundingBox();C7.copy(Q.boundingBox)}C7.applyMatrix4(J.matrixWorld),this.union(C7)}}let Z=J.children;for(let W=0,Y=Z.length;W<Y;W++)this.expandByObject(Z[W],$);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,$){return $.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,h0),h0.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let $,Q;if(J.normal.x>0)$=J.normal.x*this.min.x,Q=J.normal.x*this.max.x;else $=J.normal.x*this.max.x,Q=J.normal.x*this.min.x;if(J.normal.y>0)$+=J.normal.y*this.min.y,Q+=J.normal.y*this.max.y;else $+=J.normal.y*this.max.y,Q+=J.normal.y*this.min.y;if(J.normal.z>0)$+=J.normal.z*this.min.z,Q+=J.normal.z*this.max.z;else $+=J.normal.z*this.max.z,Q+=J.normal.z*this.min.z;return $<=-J.constant&&Q>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(H7),w7.subVectors(this.max,H7),h6.subVectors(J.a,H7),b6.subVectors(J.b,H7),x6.subVectors(J.c,H7),U6.subVectors(b6,h6),H6.subVectors(x6,b6),L6.subVectors(h6,x6);let $=[0,-U6.z,U6.y,0,-H6.z,H6.y,0,-L6.z,L6.y,U6.z,0,-U6.x,H6.z,0,-H6.x,L6.z,0,-L6.x,-U6.y,U6.x,0,-H6.y,H6.x,0,-L6.y,L6.x,0];if(!z8($,h6,b6,x6,w7))return!1;if($=[1,0,0,0,1,0,0,0,1],!z8($,h6,b6,x6,w7))return!1;return I7.crossVectors(U6,H6),$=[I7.x,I7.y,I7.z],z8($,h6,b6,x6,w7)}clampPoint(J,$){return $.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,h0).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(h0).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return a0[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),a0[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),a0[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),a0[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),a0[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),a0[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),a0[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),a0[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(a0),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}}var a0=[new T,new T,new T,new T,new T,new T,new T,new T],h0=new T,C7=new O6,h6=new T,b6=new T,x6=new T,U6=new T,H6=new T,L6=new T,H7=new T,w7=new T,I7=new T,_6=new T;function z8(J,$,Q,Z,W){for(let Y=0,K=J.length-3;Y<=K;Y+=3){_6.fromArray(J,Y);let X=W.x*Math.abs(_6.x)+W.y*Math.abs(_6.y)+W.z*Math.abs(_6.z),G=$.dot(_6),U=Q.dot(_6),V=Z.dot(_6);if(Math.max(-Math.max(G,U,V),Math.min(G,U,V))>X)return!1}return!0}var u$=new O6,V7=new T,k8=new T;class $8{constructor(J=new T,$=-1){this.isSphere=!0,this.center=J,this.radius=$}set(J,$){return this.center.copy(J),this.radius=$,this}setFromPoints(J,$){let Q=this.center;if($!==void 0)Q.copy($);else u$.setFromPoints(J).getCenter(Q);let Z=0;for(let W=0,Y=J.length;W<Y;W++)Z=Math.max(Z,Q.distanceToSquared(J[W]));return this.radius=Math.sqrt(Z),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let $=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=$*$}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,$){let Q=this.center.distanceToSquared(J);if($.copy(J),Q>this.radius*this.radius)$.sub(this.center).normalize(),$.multiplyScalar(this.radius).add(this.center);return $}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;V7.subVectors(J,this.center);let $=V7.lengthSq();if($>this.radius*this.radius){let Q=Math.sqrt($),Z=(Q-this.radius)*0.5;this.center.addScaledVector(V7,Z/Q),this.radius+=Z}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else k8.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(V7.copy(J.center).add(k8)),this.expandByPoint(V7.copy(J.center).sub(k8));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}}var r0=new T,C8=new T,T7=new T,V6=new T,w8=new T,P7=new T,I8=new T;class W9{constructor(J=new T,$=new T(0,0,-1)){this.origin=J,this.direction=$}set(J,$){return this.origin.copy(J),this.direction.copy($),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,$){return $.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,r0)),this}closestPointToPoint(J,$){$.subVectors(J,this.origin);let Q=$.dot(this.direction);if(Q<0)return $.copy(this.origin);return $.copy(this.origin).addScaledVector(this.direction,Q)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let $=r0.subVectors(J,this.origin).dot(this.direction);if($<0)return this.origin.distanceToSquared(J);return r0.copy(this.origin).addScaledVector(this.direction,$),r0.distanceToSquared(J)}distanceSqToSegment(J,$,Q,Z){C8.copy(J).add($).multiplyScalar(0.5),T7.copy($).sub(J).normalize(),V6.copy(this.origin).sub(C8);let W=J.distanceTo($)*0.5,Y=-this.direction.dot(T7),K=V6.dot(this.direction),X=-V6.dot(T7),G=V6.lengthSq(),U=Math.abs(1-Y*Y),V,H,q,D;if(U>0)if(V=Y*X-K,H=Y*K-X,D=W*U,V>=0)if(H>=-D)if(H<=D){let A=1/U;V*=A,H*=A,q=V*(V+Y*H+2*K)+H*(Y*V+H+2*X)+G}else H=W,V=Math.max(0,-(Y*H+K)),q=-V*V+H*(H+2*X)+G;else H=-W,V=Math.max(0,-(Y*H+K)),q=-V*V+H*(H+2*X)+G;else if(H<=-D)V=Math.max(0,-(-Y*W+K)),H=V>0?-W:Math.min(Math.max(-W,-X),W),q=-V*V+H*(H+2*X)+G;else if(H<=D)V=0,H=Math.min(Math.max(-W,-X),W),q=H*(H+2*X)+G;else V=Math.max(0,-(Y*W+K)),H=V>0?W:Math.min(Math.max(-W,-X),W),q=-V*V+H*(H+2*X)+G;else H=Y>0?-W:W,V=Math.max(0,-(Y*H+K)),q=-V*V+H*(H+2*X)+G;if(Q)Q.copy(this.origin).addScaledVector(this.direction,V);if(Z)Z.copy(C8).addScaledVector(T7,H);return q}intersectSphere(J,$){r0.subVectors(J.center,this.origin);let Q=r0.dot(this.direction),Z=r0.dot(r0)-Q*Q,W=J.radius*J.radius;if(Z>W)return null;let Y=Math.sqrt(W-Z),K=Q-Y,X=Q+Y;if(X<0)return null;if(K<0)return this.at(X,$);return this.at(K,$)}intersectsSphere(J){return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let $=J.normal.dot(this.direction);if($===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let Q=-(this.origin.dot(J.normal)+J.constant)/$;return Q>=0?Q:null}intersectPlane(J,$){let Q=this.distanceToPlane(J);if(Q===null)return null;return this.at(Q,$)}intersectsPlane(J){let $=J.distanceToPoint(this.origin);if($===0)return!0;if(J.normal.dot(this.direction)*$<0)return!0;return!1}intersectBox(J,$){let Q,Z,W,Y,K,X,G=1/this.direction.x,U=1/this.direction.y,V=1/this.direction.z,H=this.origin;if(G>=0)Q=(J.min.x-H.x)*G,Z=(J.max.x-H.x)*G;else Q=(J.max.x-H.x)*G,Z=(J.min.x-H.x)*G;if(U>=0)W=(J.min.y-H.y)*U,Y=(J.max.y-H.y)*U;else W=(J.max.y-H.y)*U,Y=(J.min.y-H.y)*U;if(Q>Y||W>Z)return null;if(W>Q||isNaN(Q))Q=W;if(Y<Z||isNaN(Z))Z=Y;if(V>=0)K=(J.min.z-H.z)*V,X=(J.max.z-H.z)*V;else K=(J.max.z-H.z)*V,X=(J.min.z-H.z)*V;if(Q>X||K>Z)return null;if(K>Q||Q!==Q)Q=K;if(X<Z||Z!==Z)Z=X;if(Z<0)return null;return this.at(Q>=0?Q:Z,$)}intersectsBox(J){return this.intersectBox(J,r0)!==null}intersectTriangle(J,$,Q,Z,W){w8.subVectors($,J),P7.subVectors(Q,J),I8.crossVectors(w8,P7);let Y=this.direction.dot(I8),K;if(Y>0){if(Z)return null;K=1}else if(Y<0)K=-1,Y=-Y;else return null;V6.subVectors(this.origin,J);let X=K*this.direction.dot(P7.crossVectors(V6,P7));if(X<0)return null;let G=K*this.direction.dot(w8.cross(V6));if(G<0)return null;if(X+G>Y)return null;let U=-K*V6.dot(I8);if(U<0)return null;return this.at(U/Y,W)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class K0{constructor(J,$,Q,Z,W,Y,K,X,G,U,V,H,q,D,A,O){if(K0.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,$,Q,Z,W,Y,K,X,G,U,V,H,q,D,A,O)}set(J,$,Q,Z,W,Y,K,X,G,U,V,H,q,D,A,O){let F=this.elements;return F[0]=J,F[4]=$,F[8]=Q,F[12]=Z,F[1]=W,F[5]=Y,F[9]=K,F[13]=X,F[2]=G,F[6]=U,F[10]=V,F[14]=H,F[3]=q,F[7]=D,F[11]=A,F[15]=O,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new K0().fromArray(this.elements)}copy(J){let $=this.elements,Q=J.elements;return $[0]=Q[0],$[1]=Q[1],$[2]=Q[2],$[3]=Q[3],$[4]=Q[4],$[5]=Q[5],$[6]=Q[6],$[7]=Q[7],$[8]=Q[8],$[9]=Q[9],$[10]=Q[10],$[11]=Q[11],$[12]=Q[12],$[13]=Q[13],$[14]=Q[14],$[15]=Q[15],this}copyPosition(J){let $=this.elements,Q=J.elements;return $[12]=Q[12],$[13]=Q[13],$[14]=Q[14],this}setFromMatrix3(J){let $=J.elements;return this.set($[0],$[3],$[6],0,$[1],$[4],$[7],0,$[2],$[5],$[8],0,0,0,0,1),this}extractBasis(J,$,Q){return J.setFromMatrixColumn(this,0),$.setFromMatrixColumn(this,1),Q.setFromMatrixColumn(this,2),this}makeBasis(J,$,Q){return this.set(J.x,$.x,Q.x,0,J.y,$.y,Q.y,0,J.z,$.z,Q.z,0,0,0,0,1),this}extractRotation(J){let $=this.elements,Q=J.elements,Z=1/g6.setFromMatrixColumn(J,0).length(),W=1/g6.setFromMatrixColumn(J,1).length(),Y=1/g6.setFromMatrixColumn(J,2).length();return $[0]=Q[0]*Z,$[1]=Q[1]*Z,$[2]=Q[2]*Z,$[3]=0,$[4]=Q[4]*W,$[5]=Q[5]*W,$[6]=Q[6]*W,$[7]=0,$[8]=Q[8]*Y,$[9]=Q[9]*Y,$[10]=Q[10]*Y,$[11]=0,$[12]=0,$[13]=0,$[14]=0,$[15]=1,this}makeRotationFromEuler(J){let $=this.elements,Q=J.x,Z=J.y,W=J.z,Y=Math.cos(Q),K=Math.sin(Q),X=Math.cos(Z),G=Math.sin(Z),U=Math.cos(W),V=Math.sin(W);if(J.order==="XYZ"){let H=Y*U,q=Y*V,D=K*U,A=K*V;$[0]=X*U,$[4]=-X*V,$[8]=G,$[1]=q+D*G,$[5]=H-A*G,$[9]=-K*X,$[2]=A-H*G,$[6]=D+q*G,$[10]=Y*X}else if(J.order==="YXZ"){let H=X*U,q=X*V,D=G*U,A=G*V;$[0]=H+A*K,$[4]=D*K-q,$[8]=Y*G,$[1]=Y*V,$[5]=Y*U,$[9]=-K,$[2]=q*K-D,$[6]=A+H*K,$[10]=Y*X}else if(J.order==="ZXY"){let H=X*U,q=X*V,D=G*U,A=G*V;$[0]=H-A*K,$[4]=-Y*V,$[8]=D+q*K,$[1]=q+D*K,$[5]=Y*U,$[9]=A-H*K,$[2]=-Y*G,$[6]=K,$[10]=Y*X}else if(J.order==="ZYX"){let H=Y*U,q=Y*V,D=K*U,A=K*V;$[0]=X*U,$[4]=D*G-q,$[8]=H*G+A,$[1]=X*V,$[5]=A*G+H,$[9]=q*G-D,$[2]=-G,$[6]=K*X,$[10]=Y*X}else if(J.order==="YZX"){let H=Y*X,q=Y*G,D=K*X,A=K*G;$[0]=X*U,$[4]=A-H*V,$[8]=D*V+q,$[1]=V,$[5]=Y*U,$[9]=-K*U,$[2]=-G*U,$[6]=q*V+D,$[10]=H-A*V}else if(J.order==="XZY"){let H=Y*X,q=Y*G,D=K*X,A=K*G;$[0]=X*U,$[4]=-V,$[8]=G*U,$[1]=H*V+A,$[5]=Y*U,$[9]=q*V-D,$[2]=D*V-q,$[6]=K*U,$[10]=A*V+H}return $[3]=0,$[7]=0,$[11]=0,$[12]=0,$[13]=0,$[14]=0,$[15]=1,this}makeRotationFromQuaternion(J){return this.compose(l$,J,d$)}lookAt(J,$,Q){let Z=this.elements;if(w0.subVectors(J,$),w0.lengthSq()===0)w0.z=1;if(w0.normalize(),q6.crossVectors(Q,w0),q6.lengthSq()===0){if(Math.abs(Q.z)===1)w0.x+=0.0001;else w0.z+=0.0001;w0.normalize(),q6.crossVectors(Q,w0)}return q6.normalize(),S7.crossVectors(w0,q6),Z[0]=q6.x,Z[4]=S7.x,Z[8]=w0.x,Z[1]=q6.y,Z[5]=S7.y,Z[9]=w0.y,Z[2]=q6.z,Z[6]=S7.z,Z[10]=w0.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,$){let Q=J.elements,Z=$.elements,W=this.elements,Y=Q[0],K=Q[4],X=Q[8],G=Q[12],U=Q[1],V=Q[5],H=Q[9],q=Q[13],D=Q[2],A=Q[6],O=Q[10],F=Q[14],E=Q[3],_=Q[7],N=Q[11],C=Q[15],f=Z[0],k=Z[4],w=Z[8],b=Z[12],B=Z[1],L=Z[5],S=Z[9],x=Z[13],l=Z[2],s=Z[6],d=Z[10],c=Z[14],e=Z[3],m=Z[7],YJ=Z[11],GJ=Z[15];return W[0]=Y*f+K*B+X*l+G*e,W[4]=Y*k+K*L+X*s+G*m,W[8]=Y*w+K*S+X*d+G*YJ,W[12]=Y*b+K*x+X*c+G*GJ,W[1]=U*f+V*B+H*l+q*e,W[5]=U*k+V*L+H*s+q*m,W[9]=U*w+V*S+H*d+q*YJ,W[13]=U*b+V*x+H*c+q*GJ,W[2]=D*f+A*B+O*l+F*e,W[6]=D*k+A*L+O*s+F*m,W[10]=D*w+A*S+O*d+F*YJ,W[14]=D*b+A*x+O*c+F*GJ,W[3]=E*f+_*B+N*l+C*e,W[7]=E*k+_*L+N*s+C*m,W[11]=E*w+_*S+N*d+C*YJ,W[15]=E*b+_*x+N*c+C*GJ,this}multiplyScalar(J){let $=this.elements;return $[0]*=J,$[4]*=J,$[8]*=J,$[12]*=J,$[1]*=J,$[5]*=J,$[9]*=J,$[13]*=J,$[2]*=J,$[6]*=J,$[10]*=J,$[14]*=J,$[3]*=J,$[7]*=J,$[11]*=J,$[15]*=J,this}determinant(){let J=this.elements,$=J[0],Q=J[4],Z=J[8],W=J[12],Y=J[1],K=J[5],X=J[9],G=J[13],U=J[2],V=J[6],H=J[10],q=J[14],D=J[3],A=J[7],O=J[11],F=J[15];return D*(+W*X*V-Z*G*V-W*K*H+Q*G*H+Z*K*q-Q*X*q)+A*(+$*X*q-$*G*H+W*Y*H-Z*Y*q+Z*G*U-W*X*U)+O*(+$*G*V-$*K*q-W*Y*V+Q*Y*q+W*K*U-Q*G*U)+F*(-Z*K*U-$*X*V+$*K*H+Z*Y*V-Q*Y*H+Q*X*U)}transpose(){let J=this.elements,$;return $=J[1],J[1]=J[4],J[4]=$,$=J[2],J[2]=J[8],J[8]=$,$=J[6],J[6]=J[9],J[9]=$,$=J[3],J[3]=J[12],J[12]=$,$=J[7],J[7]=J[13],J[13]=$,$=J[11],J[11]=J[14],J[14]=$,this}setPosition(J,$,Q){let Z=this.elements;if(J.isVector3)Z[12]=J.x,Z[13]=J.y,Z[14]=J.z;else Z[12]=J,Z[13]=$,Z[14]=Q;return this}invert(){let J=this.elements,$=J[0],Q=J[1],Z=J[2],W=J[3],Y=J[4],K=J[5],X=J[6],G=J[7],U=J[8],V=J[9],H=J[10],q=J[11],D=J[12],A=J[13],O=J[14],F=J[15],E=V*O*G-A*H*G+A*X*q-K*O*q-V*X*F+K*H*F,_=D*H*G-U*O*G-D*X*q+Y*O*q+U*X*F-Y*H*F,N=U*A*G-D*V*G+D*K*q-Y*A*q-U*K*F+Y*V*F,C=D*V*X-U*A*X-D*K*H+Y*A*H+U*K*O-Y*V*O,f=$*E+Q*_+Z*N+W*C;if(f===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let k=1/f;return J[0]=E*k,J[1]=(A*H*W-V*O*W-A*Z*q+Q*O*q+V*Z*F-Q*H*F)*k,J[2]=(K*O*W-A*X*W+A*Z*G-Q*O*G-K*Z*F+Q*X*F)*k,J[3]=(V*X*W-K*H*W-V*Z*G+Q*H*G+K*Z*q-Q*X*q)*k,J[4]=_*k,J[5]=(U*O*W-D*H*W+D*Z*q-$*O*q-U*Z*F+$*H*F)*k,J[6]=(D*X*W-Y*O*W-D*Z*G+$*O*G+Y*Z*F-$*X*F)*k,J[7]=(Y*H*W-U*X*W+U*Z*G-$*H*G-Y*Z*q+$*X*q)*k,J[8]=N*k,J[9]=(D*V*W-U*A*W-D*Q*q+$*A*q+U*Q*F-$*V*F)*k,J[10]=(Y*A*W-D*K*W+D*Q*G-$*A*G-Y*Q*F+$*K*F)*k,J[11]=(U*K*W-Y*V*W-U*Q*G+$*V*G+Y*Q*q-$*K*q)*k,J[12]=C*k,J[13]=(U*A*Z-D*V*Z+D*Q*H-$*A*H-U*Q*O+$*V*O)*k,J[14]=(D*K*Z-Y*A*Z-D*Q*X+$*A*X+Y*Q*O-$*K*O)*k,J[15]=(Y*V*Z-U*K*Z+U*Q*X-$*V*X-Y*Q*H+$*K*H)*k,this}scale(J){let $=this.elements,Q=J.x,Z=J.y,W=J.z;return $[0]*=Q,$[4]*=Z,$[8]*=W,$[1]*=Q,$[5]*=Z,$[9]*=W,$[2]*=Q,$[6]*=Z,$[10]*=W,$[3]*=Q,$[7]*=Z,$[11]*=W,this}getMaxScaleOnAxis(){let J=this.elements,$=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],Q=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],Z=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max($,Q,Z))}makeTranslation(J,$,Q){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,$,0,0,1,Q,0,0,0,1);return this}makeRotationX(J){let $=Math.cos(J),Q=Math.sin(J);return this.set(1,0,0,0,0,$,-Q,0,0,Q,$,0,0,0,0,1),this}makeRotationY(J){let $=Math.cos(J),Q=Math.sin(J);return this.set($,0,Q,0,0,1,0,0,-Q,0,$,0,0,0,0,1),this}makeRotationZ(J){let $=Math.cos(J),Q=Math.sin(J);return this.set($,-Q,0,0,Q,$,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,$){let Q=Math.cos($),Z=Math.sin($),W=1-Q,Y=J.x,K=J.y,X=J.z,G=W*Y,U=W*K;return this.set(G*Y+Q,G*K-Z*X,G*X+Z*K,0,G*K+Z*X,U*K+Q,U*X-Z*Y,0,G*X-Z*K,U*X+Z*Y,W*X*X+Q,0,0,0,0,1),this}makeScale(J,$,Q){return this.set(J,0,0,0,0,$,0,0,0,0,Q,0,0,0,0,1),this}makeShear(J,$,Q,Z,W,Y){return this.set(1,Q,W,0,J,1,Y,0,$,Z,1,0,0,0,0,1),this}compose(J,$,Q){let Z=this.elements,W=$._x,Y=$._y,K=$._z,X=$._w,G=W+W,U=Y+Y,V=K+K,H=W*G,q=W*U,D=W*V,A=Y*U,O=Y*V,F=K*V,E=X*G,_=X*U,N=X*V,C=Q.x,f=Q.y,k=Q.z;return Z[0]=(1-(A+F))*C,Z[1]=(q+N)*C,Z[2]=(D-_)*C,Z[3]=0,Z[4]=(q-N)*f,Z[5]=(1-(H+F))*f,Z[6]=(O+E)*f,Z[7]=0,Z[8]=(D+_)*k,Z[9]=(O-E)*k,Z[10]=(1-(H+A))*k,Z[11]=0,Z[12]=J.x,Z[13]=J.y,Z[14]=J.z,Z[15]=1,this}decompose(J,$,Q){let Z=this.elements,W=g6.set(Z[0],Z[1],Z[2]).length(),Y=g6.set(Z[4],Z[5],Z[6]).length(),K=g6.set(Z[8],Z[9],Z[10]).length();if(this.determinant()<0)W=-W;J.x=Z[12],J.y=Z[13],J.z=Z[14],b0.copy(this);let G=1/W,U=1/Y,V=1/K;return b0.elements[0]*=G,b0.elements[1]*=G,b0.elements[2]*=G,b0.elements[4]*=U,b0.elements[5]*=U,b0.elements[6]*=U,b0.elements[8]*=V,b0.elements[9]*=V,b0.elements[10]*=V,$.setFromRotationMatrix(b0),Q.x=W,Q.y=Y,Q.z=K,this}makePerspective(J,$,Q,Z,W,Y,K=2000){let X=this.elements,G=2*W/($-J),U=2*W/(Q-Z),V=($+J)/($-J),H=(Q+Z)/(Q-Z),q,D;if(K===2000)q=-(Y+W)/(Y-W),D=-2*Y*W/(Y-W);else if(K===2001)q=-Y/(Y-W),D=-Y*W/(Y-W);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+K);return X[0]=G,X[4]=0,X[8]=V,X[12]=0,X[1]=0,X[5]=U,X[9]=H,X[13]=0,X[2]=0,X[6]=0,X[10]=q,X[14]=D,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,$,Q,Z,W,Y,K=2000){let X=this.elements,G=1/($-J),U=1/(Q-Z),V=1/(Y-W),H=($+J)*G,q=(Q+Z)*U,D,A;if(K===2000)D=(Y+W)*V,A=-2*V;else if(K===2001)D=W*V,A=-1*V;else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+K);return X[0]=2*G,X[4]=0,X[8]=0,X[12]=-H,X[1]=0,X[5]=2*U,X[9]=0,X[13]=-q,X[2]=0,X[6]=0,X[10]=A,X[14]=-D,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let $=this.elements,Q=J.elements;for(let Z=0;Z<16;Z++)if($[Z]!==Q[Z])return!1;return!0}fromArray(J,$=0){for(let Q=0;Q<16;Q++)this.elements[Q]=J[Q+$];return this}toArray(J=[],$=0){let Q=this.elements;return J[$]=Q[0],J[$+1]=Q[1],J[$+2]=Q[2],J[$+3]=Q[3],J[$+4]=Q[4],J[$+5]=Q[5],J[$+6]=Q[6],J[$+7]=Q[7],J[$+8]=Q[8],J[$+9]=Q[9],J[$+10]=Q[10],J[$+11]=Q[11],J[$+12]=Q[12],J[$+13]=Q[13],J[$+14]=Q[14],J[$+15]=Q[15],J}}var g6=new T,b0=new K0,l$=new T(0,0,0),d$=new T(1,1,1),q6=new T,S7=new T,w0=new T,l9=new K0,d9=new S6;class c0{constructor(J=0,$=0,Q=0,Z=c0.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=$,this._z=Q,this._order=Z}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,$,Q,Z=this._order){return this._x=J,this._y=$,this._z=Q,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,$=this._order,Q=!0){let Z=J.elements,W=Z[0],Y=Z[4],K=Z[8],X=Z[1],G=Z[5],U=Z[9],V=Z[2],H=Z[6],q=Z[10];switch($){case"XYZ":if(this._y=Math.asin(M0(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(-U,q),this._z=Math.atan2(-Y,W);else this._x=Math.atan2(H,G),this._z=0;break;case"YXZ":if(this._x=Math.asin(-M0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(K,q),this._z=Math.atan2(X,G);else this._y=Math.atan2(-V,W),this._z=0;break;case"ZXY":if(this._x=Math.asin(M0(H,-1,1)),Math.abs(H)<0.9999999)this._y=Math.atan2(-V,q),this._z=Math.atan2(-Y,G);else this._y=0,this._z=Math.atan2(X,W);break;case"ZYX":if(this._y=Math.asin(-M0(V,-1,1)),Math.abs(V)<0.9999999)this._x=Math.atan2(H,q),this._z=Math.atan2(X,W);else this._x=0,this._z=Math.atan2(-Y,G);break;case"YZX":if(this._z=Math.asin(M0(X,-1,1)),Math.abs(X)<0.9999999)this._x=Math.atan2(-U,G),this._y=Math.atan2(-V,W);else this._x=0,this._y=Math.atan2(K,q);break;case"XZY":if(this._z=Math.asin(-M0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(H,G),this._y=Math.atan2(K,W);else this._x=Math.atan2(-U,q),this._y=0;break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+$)}if(this._order=$,Q===!0)this._onChangeCallback();return this}setFromQuaternion(J,$,Q){return l9.makeRotationFromQuaternion(J),this.setFromRotationMatrix(l9,$,Q)}setFromVector3(J,$=this._order){return this.set(J.x,J.y,J.z,$)}reorder(J){return d9.setFromEuler(this),this.setFromQuaternion(d9,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],$=0){return J[$]=this._x,J[$+1]=this._y,J[$+2]=this._z,J[$+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}c0.DEFAULT_ORDER="XYZ";class Q8{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var c$=0,c9=new T,p6=new S6,t0=new K0,y7=new T,q7=new T,n$=new T,s$=new S6,n9=new T(1,0,0),s9=new T(0,1,0),o9=new T(0,0,1),i9={type:"added"},o$={type:"removed"},m6={type:"childadded",child:null},T8={type:"childremoved",child:null};class F0 extends P6{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:c$++}),this.uuid=R6(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=F0.DEFAULT_UP.clone();let J=new T,$=new c0,Q=new S6,Z=new T(1,1,1);function W(){Q.setFromEuler($,!1)}function Y(){$.setFromQuaternion(Q,void 0,!1)}$._onChange(W),Q._onChange(Y),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:$},quaternion:{configurable:!0,enumerable:!0,value:Q},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new K0},normalMatrix:{value:new gJ}}),this.matrix=new K0,this.matrixWorld=new K0,this.matrixAutoUpdate=F0.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=F0.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Q8,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,$){this.quaternion.setFromAxisAngle(J,$)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,$){return p6.setFromAxisAngle(J,$),this.quaternion.multiply(p6),this}rotateOnWorldAxis(J,$){return p6.setFromAxisAngle(J,$),this.quaternion.premultiply(p6),this}rotateX(J){return this.rotateOnAxis(n9,J)}rotateY(J){return this.rotateOnAxis(s9,J)}rotateZ(J){return this.rotateOnAxis(o9,J)}translateOnAxis(J,$){return c9.copy(J).applyQuaternion(this.quaternion),this.position.add(c9.multiplyScalar($)),this}translateX(J){return this.translateOnAxis(n9,J)}translateY(J){return this.translateOnAxis(s9,J)}translateZ(J){return this.translateOnAxis(o9,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(t0.copy(this.matrixWorld).invert())}lookAt(J,$,Q){if(J.isVector3)y7.copy(J);else y7.set(J,$,Q);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),q7.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)t0.lookAt(q7,y7,this.up);else t0.lookAt(y7,q7,this.up);if(this.quaternion.setFromRotationMatrix(t0),Z)t0.extractRotation(Z.matrixWorld),p6.setFromRotationMatrix(t0),this.quaternion.premultiply(p6.invert())}add(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.add(arguments[$]);return this}if(J===this)return console.error("THREE.Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(i9),m6.child=J,this.dispatchEvent(m6),m6.child=null;else console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.remove(arguments[Q]);return this}let $=this.children.indexOf(J);if($!==-1)J.parent=null,this.children.splice($,1),J.dispatchEvent(o$),T8.child=J,this.dispatchEvent(T8),T8.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),t0.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),t0.multiply(J.parent.matrixWorld);return J.applyMatrix4(t0),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(i9),m6.child=J,this.dispatchEvent(m6),m6.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,$){if(this[J]===$)return this;for(let Q=0,Z=this.children.length;Q<Z;Q++){let Y=this.children[Q].getObjectByProperty(J,$);if(Y!==void 0)return Y}return}getObjectsByProperty(J,$,Q=[]){if(this[J]===$)Q.push(this);let Z=this.children;for(let W=0,Y=Z.length;W<Y;W++)Z[W].getObjectsByProperty(J,$,Q);return Q}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(q7,J,n$),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(q7,s$,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let $=this.matrixWorld.elements;return J.set($[8],$[9],$[10]).normalize()}raycast(){}traverse(J){J(this);let $=this.children;for(let Q=0,Z=$.length;Q<Z;Q++)$[Q].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let $=this.children;for(let Q=0,Z=$.length;Q<Z;Q++)$[Q].traverseVisible(J)}traverseAncestors(J){let $=this.parent;if($!==null)J($),$.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let $=this.children;for(let Q=0,Z=$.length;Q<Z;Q++)$[Q].updateMatrixWorld(J)}updateWorldMatrix(J,$){let Q=this.parent;if(J===!0&&Q!==null)Q.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);if($===!0){let Z=this.children;for(let W=0,Y=Z.length;W<Y;W++)Z[W].updateWorldMatrix(!1,!0)}}toJSON(J){let $=J===void 0||typeof J==="string",Q={};if($)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},Q.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,this.name!=="")Z.name=this.name;if(this.castShadow===!0)Z.castShadow=!0;if(this.receiveShadow===!0)Z.receiveShadow=!0;if(this.visible===!1)Z.visible=!1;if(this.frustumCulled===!1)Z.frustumCulled=!1;if(this.renderOrder!==0)Z.renderOrder=this.renderOrder;if(Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.matrixAutoUpdate===!1)Z.matrixAutoUpdate=!1;if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.visibility=this._visibility,Z.active=this._active,Z.bounds=this._bounds.map((K)=>({boxInitialized:K.boxInitialized,boxMin:K.box.min.toArray(),boxMax:K.box.max.toArray(),sphereInitialized:K.sphereInitialized,sphereRadius:K.sphere.radius,sphereCenter:K.sphere.center.toArray()})),Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.geometryCount=this._geometryCount,Z.matricesTexture=this._matricesTexture.toJSON(J),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)Z.boundingSphere={center:Z.boundingSphere.center.toArray(),radius:Z.boundingSphere.radius};if(this.boundingBox!==null)Z.boundingBox={min:Z.boundingBox.min.toArray(),max:Z.boundingBox.max.toArray()}}function W(K,X){if(K[X.uuid]===void 0)K[X.uuid]=X.toJSON(J);return X.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=W(J.geometries,this.geometry);let K=this.geometry.parameters;if(K!==void 0&&K.shapes!==void 0){let X=K.shapes;if(Array.isArray(X))for(let G=0,U=X.length;G<U;G++){let V=X[G];W(J.shapes,V)}else W(J.shapes,X)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)W(J.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let K=[];for(let X=0,G=this.material.length;X<G;X++)K.push(W(J.materials,this.material[X]));Z.material=K}else Z.material=W(J.materials,this.material);if(this.children.length>0){Z.children=[];for(let K=0;K<this.children.length;K++)Z.children.push(this.children[K].toJSON(J).object)}if(this.animations.length>0){Z.animations=[];for(let K=0;K<this.animations.length;K++){let X=this.animations[K];Z.animations.push(W(J.animations,X))}}if($){let K=Y(J.geometries),X=Y(J.materials),G=Y(J.textures),U=Y(J.images),V=Y(J.shapes),H=Y(J.skeletons),q=Y(J.animations),D=Y(J.nodes);if(K.length>0)Q.geometries=K;if(X.length>0)Q.materials=X;if(G.length>0)Q.textures=G;if(U.length>0)Q.images=U;if(V.length>0)Q.shapes=V;if(H.length>0)Q.skeletons=H;if(q.length>0)Q.animations=q;if(D.length>0)Q.nodes=D}return Q.object=Z,Q;function Y(K){let X=[];for(let G in K){let U=K[G];delete U.metadata,X.push(U)}return X}}clone(J){return new this.constructor().copy(this,J)}copy(J,$=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),$===!0)for(let Q=0;Q<J.children.length;Q++){let Z=J.children[Q];this.add(Z.clone())}return this}}F0.DEFAULT_UP=new T(0,1,0);F0.DEFAULT_MATRIX_AUTO_UPDATE=!0;F0.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var x0=new T,e0=new T,P8=new T,J6=new T,u6=new T,l6=new T,a9=new T,S8=new T,y8=new T,v8=new T,j8=new U0,f8=new U0,h8=new U0;class v0{constructor(J=new T,$=new T,Q=new T){this.a=J,this.b=$,this.c=Q}static getNormal(J,$,Q,Z){Z.subVectors(Q,$),x0.subVectors(J,$),Z.cross(x0);let W=Z.lengthSq();if(W>0)return Z.multiplyScalar(1/Math.sqrt(W));return Z.set(0,0,0)}static getBarycoord(J,$,Q,Z,W){x0.subVectors(Z,$),e0.subVectors(Q,$),P8.subVectors(J,$);let Y=x0.dot(x0),K=x0.dot(e0),X=x0.dot(P8),G=e0.dot(e0),U=e0.dot(P8),V=Y*G-K*K;if(V===0)return W.set(0,0,0),null;let H=1/V,q=(G*X-K*U)*H,D=(Y*U-K*X)*H;return W.set(1-q-D,D,q)}static containsPoint(J,$,Q,Z){if(this.getBarycoord(J,$,Q,Z,J6)===null)return!1;return J6.x>=0&&J6.y>=0&&J6.x+J6.y<=1}static getInterpolation(J,$,Q,Z,W,Y,K,X){if(this.getBarycoord(J,$,Q,Z,J6)===null){if(X.x=0,X.y=0,"z"in X)X.z=0;if("w"in X)X.w=0;return null}return X.setScalar(0),X.addScaledVector(W,J6.x),X.addScaledVector(Y,J6.y),X.addScaledVector(K,J6.z),X}static getInterpolatedAttribute(J,$,Q,Z,W,Y){return j8.setScalar(0),f8.setScalar(0),h8.setScalar(0),j8.fromBufferAttribute(J,$),f8.fromBufferAttribute(J,Q),h8.fromBufferAttribute(J,Z),Y.setScalar(0),Y.addScaledVector(j8,W.x),Y.addScaledVector(f8,W.y),Y.addScaledVector(h8,W.z),Y}static isFrontFacing(J,$,Q,Z){return x0.subVectors(Q,$),e0.subVectors(J,$),x0.cross(e0).dot(Z)<0?!0:!1}set(J,$,Q){return this.a.copy(J),this.b.copy($),this.c.copy(Q),this}setFromPointsAndIndices(J,$,Q,Z){return this.a.copy(J[$]),this.b.copy(J[Q]),this.c.copy(J[Z]),this}setFromAttributeAndIndices(J,$,Q,Z){return this.a.fromBufferAttribute(J,$),this.b.fromBufferAttribute(J,Q),this.c.fromBufferAttribute(J,Z),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return x0.subVectors(this.c,this.b),e0.subVectors(this.a,this.b),x0.cross(e0).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return v0.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,$){return v0.getBarycoord(J,this.a,this.b,this.c,$)}getInterpolation(J,$,Q,Z,W){return v0.getInterpolation(J,this.a,this.b,this.c,$,Q,Z,W)}containsPoint(J){return v0.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return v0.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,$){let Q=this.a,Z=this.b,W=this.c,Y,K;u6.subVectors(Z,Q),l6.subVectors(W,Q),S8.subVectors(J,Q);let X=u6.dot(S8),G=l6.dot(S8);if(X<=0&&G<=0)return $.copy(Q);y8.subVectors(J,Z);let U=u6.dot(y8),V=l6.dot(y8);if(U>=0&&V<=U)return $.copy(Z);let H=X*V-U*G;if(H<=0&&X>=0&&U<=0)return Y=X/(X-U),$.copy(Q).addScaledVector(u6,Y);v8.subVectors(J,W);let q=u6.dot(v8),D=l6.dot(v8);if(D>=0&&q<=D)return $.copy(W);let A=q*G-X*D;if(A<=0&&G>=0&&D<=0)return K=G/(G-D),$.copy(Q).addScaledVector(l6,K);let O=U*D-q*V;if(O<=0&&V-U>=0&&q-D>=0)return a9.subVectors(W,Z),K=(V-U)/(V-U+(q-D)),$.copy(Z).addScaledVector(a9,K);let F=1/(O+A+H);return Y=A*F,K=H*F,$.copy(Q).addScaledVector(u6,Y).addScaledVector(l6,K)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}var d5={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},E6={h:0,s:0,l:0},v7={h:0,s:0,l:0};function b8(J,$,Q){if(Q<0)Q+=1;if(Q>1)Q-=1;if(Q<0.16666666666666666)return J+($-J)*6*Q;if(Q<0.5)return $;if(Q<0.6666666666666666)return J+($-J)*6*(0.6666666666666666-Q);return J}class nJ{constructor(J,$,Q){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,$,Q)}set(J,$,Q){if($===void 0&&Q===void 0){let Z=J;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB(J,$,Q);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,$="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,oJ.toWorkingColorSpace(this,$),this}setRGB(J,$,Q,Z=oJ.workingColorSpace){return this.r=J,this.g=$,this.b=Q,oJ.toWorkingColorSpace(this,Z),this}setHSL(J,$,Q,Z=oJ.workingColorSpace){if(J=f$(J,1),$=M0($,0,1),Q=M0(Q,0,1),$===0)this.r=this.g=this.b=Q;else{let W=Q<=0.5?Q*(1+$):Q+$-Q*$,Y=2*Q-W;this.r=b8(Y,W,J+0.3333333333333333),this.g=b8(Y,W,J),this.b=b8(Y,W,J-0.3333333333333333)}return oJ.toWorkingColorSpace(this,Z),this}setStyle(J,$="srgb"){function Q(W){if(W===void 0)return;if(parseFloat(W)<1)console.warn("THREE.Color: Alpha component of "+J+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec(J)){let W,Y=Z[1],K=Z[2];switch(Y){case"rgb":case"rgba":if(W=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(K))return Q(W[4]),this.setRGB(Math.min(255,parseInt(W[1],10))/255,Math.min(255,parseInt(W[2],10))/255,Math.min(255,parseInt(W[3],10))/255,$);if(W=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(K))return Q(W[4]),this.setRGB(Math.min(100,parseInt(W[1],10))/100,Math.min(100,parseInt(W[2],10))/100,Math.min(100,parseInt(W[3],10))/100,$);break;case"hsl":case"hsla":if(W=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(K))return Q(W[4]),this.setHSL(parseFloat(W[1])/360,parseFloat(W[2])/100,parseFloat(W[3])/100,$);break;default:console.warn("THREE.Color: Unknown color model "+J)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec(J)){let W=Z[1],Y=W.length;if(Y===3)return this.setRGB(parseInt(W.charAt(0),16)/15,parseInt(W.charAt(1),16)/15,parseInt(W.charAt(2),16)/15,$);else if(Y===6)return this.setHex(parseInt(W,16),$);else console.warn("THREE.Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,$);return this}setColorName(J,$="srgb"){let Q=d5[J.toLowerCase()];if(Q!==void 0)this.setHex(Q,$);else console.warn("THREE.Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=$6(J.r),this.g=$6(J.g),this.b=$6(J.b),this}copyLinearToSRGB(J){return this.r=e6(J.r),this.g=e6(J.g),this.b=e6(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return oJ.fromWorkingColorSpace(O0.copy(this),J),Math.round(M0(O0.r*255,0,255))*65536+Math.round(M0(O0.g*255,0,255))*256+Math.round(M0(O0.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,$=oJ.workingColorSpace){oJ.fromWorkingColorSpace(O0.copy(this),$);let{r:Q,g:Z,b:W}=O0,Y=Math.max(Q,Z,W),K=Math.min(Q,Z,W),X,G,U=(K+Y)/2;if(K===Y)X=0,G=0;else{let V=Y-K;switch(G=U<=0.5?V/(Y+K):V/(2-Y-K),Y){case Q:X=(Z-W)/V+(Z<W?6:0);break;case Z:X=(W-Q)/V+2;break;case W:X=(Q-Z)/V+4;break}X/=6}return J.h=X,J.s=G,J.l=U,J}getRGB(J,$=oJ.workingColorSpace){return oJ.fromWorkingColorSpace(O0.copy(this),$),J.r=O0.r,J.g=O0.g,J.b=O0.b,J}getStyle(J="srgb"){oJ.fromWorkingColorSpace(O0.copy(this),J);let{r:$,g:Q,b:Z}=O0;if(J!=="srgb")return`color(${J} ${$.toFixed(3)} ${Q.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round($*255)},${Math.round(Q*255)},${Math.round(Z*255)})`}offsetHSL(J,$,Q){return this.getHSL(E6),this.setHSL(E6.h+J,E6.s+$,E6.l+Q)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,$){return this.r=J.r+$.r,this.g=J.g+$.g,this.b=J.b+$.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,$){return this.r+=(J.r-this.r)*$,this.g+=(J.g-this.g)*$,this.b+=(J.b-this.b)*$,this}lerpColors(J,$,Q){return this.r=J.r+($.r-J.r)*Q,this.g=J.g+($.g-J.g)*Q,this.b=J.b+($.b-J.b)*Q,this}lerpHSL(J,$){this.getHSL(E6),J.getHSL(v7);let Q=B8(E6.h,v7.h,$),Z=B8(E6.s,v7.s,$),W=B8(E6.l,v7.l,$);return this.setHSL(Q,Z,W),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let $=this.r,Q=this.g,Z=this.b,W=J.elements;return this.r=W[0]*$+W[3]*Q+W[6]*Z,this.g=W[1]*$+W[4]*Q+W[7]*Z,this.b=W[2]*$+W[5]*Q+W[8]*Z,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,$=0){return this.r=J[$],this.g=J[$+1],this.b=J[$+2],this}toArray(J=[],$=0){return J[$]=this.r,J[$+1]=this.g,J[$+2]=this.b,J}fromBufferAttribute(J,$){return this.r=J.getX($),this.g=J.getY($),this.b=J.getZ($),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var O0=new nJ;nJ.NAMES=d5;var i$=0;class y6 extends P6{static get type(){return"Material"}get type(){return this.constructor.type}set type(J){}constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:i$++}),this.uuid=R6(),this.name="",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new nJ(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let $ in J){let Q=J[$];if(Q===void 0){console.warn(`THREE.Material: parameter '${$}' has value of undefined.`);continue}let Z=this[$];if(Z===void 0){console.warn(`THREE.Material: '${$}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set(Q);else if(Z&&Z.isVector3&&(Q&&Q.isVector3))Z.copy(Q);else this[$]=Q}}toJSON(J){let $=J===void 0||typeof J==="string";if($)J={textures:{},images:{}};let Q={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};if(Q.uuid=this.uuid,Q.type=this.type,this.name!=="")Q.name=this.name;if(this.color&&this.color.isColor)Q.color=this.color.getHex();if(this.roughness!==void 0)Q.roughness=this.roughness;if(this.metalness!==void 0)Q.metalness=this.metalness;if(this.sheen!==void 0)Q.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)Q.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)Q.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)Q.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)Q.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)Q.specular=this.specular.getHex();if(this.specularIntensity!==void 0)Q.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)Q.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)Q.shininess=this.shininess;if(this.clearcoat!==void 0)Q.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)Q.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)Q.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)Q.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)Q.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,Q.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.dispersion!==void 0)Q.dispersion=this.dispersion;if(this.iridescence!==void 0)Q.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)Q.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)Q.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)Q.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)Q.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)Q.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)Q.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)Q.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)Q.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)Q.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)Q.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)Q.lightMap=this.lightMap.toJSON(J).uuid,Q.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)Q.aoMap=this.aoMap.toJSON(J).uuid,Q.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)Q.bumpMap=this.bumpMap.toJSON(J).uuid,Q.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)Q.normalMap=this.normalMap.toJSON(J).uuid,Q.normalMapType=this.normalMapType,Q.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)Q.displacementMap=this.displacementMap.toJSON(J).uuid,Q.displacementScale=this.displacementScale,Q.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)Q.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)Q.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)Q.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)Q.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)Q.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)Q.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if(Q.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)Q.combine=this.combine}if(this.envMapRotation!==void 0)Q.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)Q.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)Q.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)Q.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)Q.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)Q.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)Q.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)Q.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)Q.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)Q.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)Q.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)Q.size=this.size;if(this.shadowSide!==null)Q.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)Q.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)Q.blending=this.blending;if(this.side!==0)Q.side=this.side;if(this.vertexColors===!0)Q.vertexColors=!0;if(this.opacity<1)Q.opacity=this.opacity;if(this.transparent===!0)Q.transparent=!0;if(this.blendSrc!==204)Q.blendSrc=this.blendSrc;if(this.blendDst!==205)Q.blendDst=this.blendDst;if(this.blendEquation!==100)Q.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)Q.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)Q.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)Q.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)Q.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)Q.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)Q.depthFunc=this.depthFunc;if(this.depthTest===!1)Q.depthTest=this.depthTest;if(this.depthWrite===!1)Q.depthWrite=this.depthWrite;if(this.colorWrite===!1)Q.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)Q.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)Q.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)Q.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)Q.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)Q.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)Q.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)Q.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)Q.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)Q.rotation=this.rotation;if(this.polygonOffset===!0)Q.polygonOffset=!0;if(this.polygonOffsetFactor!==0)Q.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)Q.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)Q.linewidth=this.linewidth;if(this.dashSize!==void 0)Q.dashSize=this.dashSize;if(this.gapSize!==void 0)Q.gapSize=this.gapSize;if(this.scale!==void 0)Q.scale=this.scale;if(this.dithering===!0)Q.dithering=!0;if(this.alphaTest>0)Q.alphaTest=this.alphaTest;if(this.alphaHash===!0)Q.alphaHash=!0;if(this.alphaToCoverage===!0)Q.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)Q.premultipliedAlpha=!0;if(this.forceSinglePass===!0)Q.forceSinglePass=!0;if(this.wireframe===!0)Q.wireframe=!0;if(this.wireframeLinewidth>1)Q.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")Q.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")Q.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)Q.flatShading=!0;if(this.visible===!1)Q.visible=!1;if(this.toneMapped===!1)Q.toneMapped=!1;if(this.fog===!1)Q.fog=!1;if(Object.keys(this.userData).length>0)Q.userData=this.userData;function Z(W){let Y=[];for(let K in W){let X=W[K];delete X.metadata,Y.push(X)}return Y}if($){let W=Z(J.textures),Y=Z(J.images);if(W.length>0)Q.textures=W;if(Y.length>0)Q.images=Y}return Q}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let $=J.clippingPlanes,Q=null;if($!==null){let Z=$.length;Q=Array(Z);for(let W=0;W!==Z;++W)Q[W]=$[W].clone()}return this.clippingPlanes=Q,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class M6 extends y6{static get type(){return"MeshBasicMaterial"}constructor(J){super();this.isMeshBasicMaterial=!0,this.color=new nJ(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new c0,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var H0=new T,j7=new MJ;class j0{constructor(J,$,Q=!1){if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=J,this.itemSize=$,this.count=J!==void 0?J.length/$:0,this.normalized=Q,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,$){this.updateRanges.push({start:J,count:$})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,$,Q){J*=this.itemSize,Q*=$.itemSize;for(let Z=0,W=this.itemSize;Z<W;Z++)this.array[J+Z]=$.array[Q+Z];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let $=0,Q=this.count;$<Q;$++)j7.fromBufferAttribute(this,$),j7.applyMatrix3(J),this.setXY($,j7.x,j7.y);else if(this.itemSize===3)for(let $=0,Q=this.count;$<Q;$++)H0.fromBufferAttribute(this,$),H0.applyMatrix3(J),this.setXYZ($,H0.x,H0.y,H0.z);return this}applyMatrix4(J){for(let $=0,Q=this.count;$<Q;$++)H0.fromBufferAttribute(this,$),H0.applyMatrix4(J),this.setXYZ($,H0.x,H0.y,H0.z);return this}applyNormalMatrix(J){for(let $=0,Q=this.count;$<Q;$++)H0.fromBufferAttribute(this,$),H0.applyNormalMatrix(J),this.setXYZ($,H0.x,H0.y,H0.z);return this}transformDirection(J){for(let $=0,Q=this.count;$<Q;$++)H0.fromBufferAttribute(this,$),H0.transformDirection(J),this.setXYZ($,H0.x,H0.y,H0.z);return this}set(J,$=0){return this.array.set(J,$),this}getComponent(J,$){let Q=this.array[J*this.itemSize+$];if(this.normalized)Q=d0(Q,this.array);return Q}setComponent(J,$,Q){if(this.normalized)Q=J0(Q,this.array);return this.array[J*this.itemSize+$]=Q,this}getX(J){let $=this.array[J*this.itemSize];if(this.normalized)$=d0($,this.array);return $}setX(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize]=$,this}getY(J){let $=this.array[J*this.itemSize+1];if(this.normalized)$=d0($,this.array);return $}setY(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize+1]=$,this}getZ(J){let $=this.array[J*this.itemSize+2];if(this.normalized)$=d0($,this.array);return $}setZ(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize+2]=$,this}getW(J){let $=this.array[J*this.itemSize+3];if(this.normalized)$=d0($,this.array);return $}setW(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize+3]=$,this}setXY(J,$,Q){if(J*=this.itemSize,this.normalized)$=J0($,this.array),Q=J0(Q,this.array);return this.array[J+0]=$,this.array[J+1]=Q,this}setXYZ(J,$,Q,Z){if(J*=this.itemSize,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array);return this.array[J+0]=$,this.array[J+1]=Q,this.array[J+2]=Z,this}setXYZW(J,$,Q,Z,W){if(J*=this.itemSize,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array),W=J0(W,this.array);return this.array[J+0]=$,this.array[J+1]=Q,this.array[J+2]=Z,this.array[J+3]=W,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")J.name=this.name;if(this.usage!==35044)J.usage=this.usage;return J}}class Y9 extends j0{constructor(J,$,Q){super(new Uint16Array(J),$,Q)}}class K9 extends j0{constructor(J,$,Q){super(new Uint32Array(J),$,Q)}}class eJ extends j0{constructor(J,$,Q){super(new Float32Array(J),$,Q)}}var a$=0,S0=new K0,x8=new F0,d6=new T,I0=new O6,E7=new O6,E0=new T;class z0 extends P6{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:a$++}),this.uuid=R6(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((p5(J))?K9:Y9)(J,1);else this.index=J;return this}setIndirect(J){return this.indirect=J,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,$){return this.attributes[J]=$,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,$,Q=0){this.groups.push({start:J,count:$,materialIndex:Q})}clearGroups(){this.groups=[]}setDrawRange(J,$){this.drawRange.start=J,this.drawRange.count=$}applyMatrix4(J){let $=this.attributes.position;if($!==void 0)$.applyMatrix4(J),$.needsUpdate=!0;let Q=this.attributes.normal;if(Q!==void 0){let W=new gJ().getNormalMatrix(J);Q.applyNormalMatrix(W),Q.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection(J),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this}applyQuaternion(J){return S0.makeRotationFromQuaternion(J),this.applyMatrix4(S0),this}rotateX(J){return S0.makeRotationX(J),this.applyMatrix4(S0),this}rotateY(J){return S0.makeRotationY(J),this.applyMatrix4(S0),this}rotateZ(J){return S0.makeRotationZ(J),this.applyMatrix4(S0),this}translate(J,$,Q){return S0.makeTranslation(J,$,Q),this.applyMatrix4(S0),this}scale(J,$,Q){return S0.makeScale(J,$,Q),this.applyMatrix4(S0),this}lookAt(J){return x8.lookAt(J),x8.updateMatrix(),this.applyMatrix4(x8.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(d6).negate(),this.translate(d6.x,d6.y,d6.z),this}setFromPoints(J){let $=this.getAttribute("position");if($===void 0){let Q=[];for(let Z=0,W=J.length;Z<W;Z++){let Y=J[Z];Q.push(Y.x,Y.y,Y.z||0)}this.setAttribute("position",new eJ(Q,3))}else{for(let Q=0,Z=$.count;Q<Z;Q++){let W=J[Q];$.setXYZ(Q,W.x,W.y,W.z||0)}if(J.length>$.count)console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");$.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new O6;let J=this.attributes.position,$=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new T(-1/0,-1/0,-1/0),new T(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),$)for(let Q=0,Z=$.length;Q<Z;Q++){let W=$[Q];if(I0.setFromBufferAttribute(W),this.morphTargetsRelative)E0.addVectors(this.boundingBox.min,I0.min),this.boundingBox.expandByPoint(E0),E0.addVectors(this.boundingBox.max,I0.max),this.boundingBox.expandByPoint(E0);else this.boundingBox.expandByPoint(I0.min),this.boundingBox.expandByPoint(I0.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new $8;let J=this.attributes.position,$=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new T,1/0);return}if(J){let Q=this.boundingSphere.center;if(I0.setFromBufferAttribute(J),$)for(let W=0,Y=$.length;W<Y;W++){let K=$[W];if(E7.setFromBufferAttribute(K),this.morphTargetsRelative)E0.addVectors(I0.min,E7.min),I0.expandByPoint(E0),E0.addVectors(I0.max,E7.max),I0.expandByPoint(E0);else I0.expandByPoint(E7.min),I0.expandByPoint(E7.max)}I0.getCenter(Q);let Z=0;for(let W=0,Y=J.count;W<Y;W++)E0.fromBufferAttribute(J,W),Z=Math.max(Z,Q.distanceToSquared(E0));if($)for(let W=0,Y=$.length;W<Y;W++){let K=$[W],X=this.morphTargetsRelative;for(let G=0,U=K.count;G<U;G++){if(E0.fromBufferAttribute(K,G),X)d6.fromBufferAttribute(J,G),E0.add(d6);Z=Math.max(Z,Q.distanceToSquared(E0))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,$=this.attributes;if(J===null||$.position===void 0||$.normal===void 0||$.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:Q,normal:Z,uv:W}=$;if(this.hasAttribute("tangent")===!1)this.setAttribute("tangent",new j0(new Float32Array(4*Q.count),4));let Y=this.getAttribute("tangent"),K=[],X=[];for(let w=0;w<Q.count;w++)K[w]=new T,X[w]=new T;let G=new T,U=new T,V=new T,H=new MJ,q=new MJ,D=new MJ,A=new T,O=new T;function F(w,b,B){G.fromBufferAttribute(Q,w),U.fromBufferAttribute(Q,b),V.fromBufferAttribute(Q,B),H.fromBufferAttribute(W,w),q.fromBufferAttribute(W,b),D.fromBufferAttribute(W,B),U.sub(G),V.sub(G),q.sub(H),D.sub(H);let L=1/(q.x*D.y-D.x*q.y);if(!isFinite(L))return;A.copy(U).multiplyScalar(D.y).addScaledVector(V,-q.y).multiplyScalar(L),O.copy(V).multiplyScalar(q.x).addScaledVector(U,-D.x).multiplyScalar(L),K[w].add(A),K[b].add(A),K[B].add(A),X[w].add(O),X[b].add(O),X[B].add(O)}let E=this.groups;if(E.length===0)E=[{start:0,count:J.count}];for(let w=0,b=E.length;w<b;++w){let B=E[w],L=B.start,S=B.count;for(let x=L,l=L+S;x<l;x+=3)F(J.getX(x+0),J.getX(x+1),J.getX(x+2))}let _=new T,N=new T,C=new T,f=new T;function k(w){C.fromBufferAttribute(Z,w),f.copy(C);let b=K[w];_.copy(b),_.sub(C.multiplyScalar(C.dot(b))).normalize(),N.crossVectors(f,b);let L=N.dot(X[w])<0?-1:1;Y.setXYZW(w,_.x,_.y,_.z,L)}for(let w=0,b=E.length;w<b;++w){let B=E[w],L=B.start,S=B.count;for(let x=L,l=L+S;x<l;x+=3)k(J.getX(x+0)),k(J.getX(x+1)),k(J.getX(x+2))}}computeVertexNormals(){let J=this.index,$=this.getAttribute("position");if($!==void 0){let Q=this.getAttribute("normal");if(Q===void 0)Q=new j0(new Float32Array($.count*3),3),this.setAttribute("normal",Q);else for(let H=0,q=Q.count;H<q;H++)Q.setXYZ(H,0,0,0);let Z=new T,W=new T,Y=new T,K=new T,X=new T,G=new T,U=new T,V=new T;if(J)for(let H=0,q=J.count;H<q;H+=3){let D=J.getX(H+0),A=J.getX(H+1),O=J.getX(H+2);Z.fromBufferAttribute($,D),W.fromBufferAttribute($,A),Y.fromBufferAttribute($,O),U.subVectors(Y,W),V.subVectors(Z,W),U.cross(V),K.fromBufferAttribute(Q,D),X.fromBufferAttribute(Q,A),G.fromBufferAttribute(Q,O),K.add(U),X.add(U),G.add(U),Q.setXYZ(D,K.x,K.y,K.z),Q.setXYZ(A,X.x,X.y,X.z),Q.setXYZ(O,G.x,G.y,G.z)}else for(let H=0,q=$.count;H<q;H+=3)Z.fromBufferAttribute($,H+0),W.fromBufferAttribute($,H+1),Y.fromBufferAttribute($,H+2),U.subVectors(Y,W),V.subVectors(Z,W),U.cross(V),Q.setXYZ(H+0,U.x,U.y,U.z),Q.setXYZ(H+1,U.x,U.y,U.z),Q.setXYZ(H+2,U.x,U.y,U.z);this.normalizeNormals(),Q.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let $=0,Q=J.count;$<Q;$++)E0.fromBufferAttribute(J,$),E0.normalize(),J.setXYZ($,E0.x,E0.y,E0.z)}toNonIndexed(){function J(K,X){let{array:G,itemSize:U,normalized:V}=K,H=new G.constructor(X.length*U),q=0,D=0;for(let A=0,O=X.length;A<O;A++){if(K.isInterleavedBufferAttribute)q=X[A]*K.data.stride+K.offset;else q=X[A]*U;for(let F=0;F<U;F++)H[D++]=G[q++]}return new j0(H,U,V)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let $=new z0,Q=this.index.array,Z=this.attributes;for(let K in Z){let X=Z[K],G=J(X,Q);$.setAttribute(K,G)}let W=this.morphAttributes;for(let K in W){let X=[],G=W[K];for(let U=0,V=G.length;U<V;U++){let H=G[U],q=J(H,Q);X.push(q)}$.morphAttributes[K]=X}$.morphTargetsRelative=this.morphTargetsRelative;let Y=this.groups;for(let K=0,X=Y.length;K<X;K++){let G=Y[K];$.addGroup(G.start,G.count,G.materialIndex)}return $}toJSON(){let J={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.type,this.name!=="")J.name=this.name;if(Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0){let X=this.parameters;for(let G in X)if(X[G]!==void 0)J[G]=X[G];return J}J.data={attributes:{}};let $=this.index;if($!==null)J.data.index={type:$.array.constructor.name,array:Array.prototype.slice.call($.array)};let Q=this.attributes;for(let X in Q){let G=Q[X];J.data.attributes[X]=G.toJSON(J.data)}let Z={},W=!1;for(let X in this.morphAttributes){let G=this.morphAttributes[X],U=[];for(let V=0,H=G.length;V<H;V++){let q=G[V];U.push(q.toJSON(J.data))}if(U.length>0)Z[X]=U,W=!0}if(W)J.data.morphAttributes=Z,J.data.morphTargetsRelative=this.morphTargetsRelative;let Y=this.groups;if(Y.length>0)J.data.groups=JSON.parse(JSON.stringify(Y));let K=this.boundingSphere;if(K!==null)J.data.boundingSphere={center:K.center.toArray(),radius:K.radius};return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let $={};this.name=J.name;let Q=J.index;if(Q!==null)this.setIndex(Q.clone($));let Z=J.attributes;for(let G in Z){let U=Z[G];this.setAttribute(G,U.clone($))}let W=J.morphAttributes;for(let G in W){let U=[],V=W[G];for(let H=0,q=V.length;H<q;H++)U.push(V[H].clone($));this.morphAttributes[G]=U}this.morphTargetsRelative=J.morphTargetsRelative;let Y=J.groups;for(let G=0,U=Y.length;G<U;G++){let V=Y[G];this.addGroup(V.start,V.count,V.materialIndex)}let K=J.boundingBox;if(K!==null)this.boundingBox=K.clone();let X=J.boundingSphere;if(X!==null)this.boundingSphere=X.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}var r9=new K0,z6=new W9,f7=new $8,t9=new T,h7=new T,b7=new T,x7=new T,g8=new T,g7=new T,e9=new T,p7=new T;class PJ extends F0{constructor(J=new z0,$=new M6){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=$,this.updateMorphTargets()}copy(J,$){if(super.copy(J,$),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let $=this.geometry.morphAttributes,Q=Object.keys($);if(Q.length>0){let Z=$[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,Y=Z.length;W<Y;W++){let K=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[K]=W}}}}getVertexPosition(J,$){let Q=this.geometry,Z=Q.attributes.position,W=Q.morphAttributes.position,Y=Q.morphTargetsRelative;$.fromBufferAttribute(Z,J);let K=this.morphTargetInfluences;if(W&&K){g7.set(0,0,0);for(let X=0,G=W.length;X<G;X++){let U=K[X],V=W[X];if(U===0)continue;if(g8.fromBufferAttribute(V,J),Y)g7.addScaledVector(g8,U);else g7.addScaledVector(g8.sub($),U)}$.add(g7)}return $}raycast(J,$){let Q=this.geometry,Z=this.material,W=this.matrixWorld;if(Z===void 0)return;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(f7.copy(Q.boundingSphere),f7.applyMatrix4(W),z6.copy(J.ray).recast(J.near),f7.containsPoint(z6.origin)===!1){if(z6.intersectSphere(f7,t9)===null)return;if(z6.origin.distanceToSquared(t9)>(J.far-J.near)**2)return}if(r9.copy(W).invert(),z6.copy(J.ray).applyMatrix4(r9),Q.boundingBox!==null){if(z6.intersectsBox(Q.boundingBox)===!1)return}this._computeIntersections(J,$,z6)}_computeIntersections(J,$,Q){let Z,W=this.geometry,Y=this.material,K=W.index,X=W.attributes.position,G=W.attributes.uv,U=W.attributes.uv1,V=W.attributes.normal,H=W.groups,q=W.drawRange;if(K!==null)if(Array.isArray(Y))for(let D=0,A=H.length;D<A;D++){let O=H[D],F=Y[O.materialIndex],E=Math.max(O.start,q.start),_=Math.min(K.count,Math.min(O.start+O.count,q.start+q.count));for(let N=E,C=_;N<C;N+=3){let f=K.getX(N),k=K.getX(N+1),w=K.getX(N+2);if(Z=m7(this,F,J,Q,G,U,V,f,k,w),Z)Z.faceIndex=Math.floor(N/3),Z.face.materialIndex=O.materialIndex,$.push(Z)}}else{let D=Math.max(0,q.start),A=Math.min(K.count,q.start+q.count);for(let O=D,F=A;O<F;O+=3){let E=K.getX(O),_=K.getX(O+1),N=K.getX(O+2);if(Z=m7(this,Y,J,Q,G,U,V,E,_,N),Z)Z.faceIndex=Math.floor(O/3),$.push(Z)}}else if(X!==void 0)if(Array.isArray(Y))for(let D=0,A=H.length;D<A;D++){let O=H[D],F=Y[O.materialIndex],E=Math.max(O.start,q.start),_=Math.min(X.count,Math.min(O.start+O.count,q.start+q.count));for(let N=E,C=_;N<C;N+=3){let f=N,k=N+1,w=N+2;if(Z=m7(this,F,J,Q,G,U,V,f,k,w),Z)Z.faceIndex=Math.floor(N/3),Z.face.materialIndex=O.materialIndex,$.push(Z)}}else{let D=Math.max(0,q.start),A=Math.min(X.count,q.start+q.count);for(let O=D,F=A;O<F;O+=3){let E=O,_=O+1,N=O+2;if(Z=m7(this,Y,J,Q,G,U,V,E,_,N),Z)Z.faceIndex=Math.floor(O/3),$.push(Z)}}}}function r$(J,$,Q,Z,W,Y,K,X){let G;if($.side===1)G=Z.intersectTriangle(K,Y,W,!0,X);else G=Z.intersectTriangle(W,Y,K,$.side===0,X);if(G===null)return null;p7.copy(X),p7.applyMatrix4(J.matrixWorld);let U=Q.ray.origin.distanceTo(p7);if(U<Q.near||U>Q.far)return null;return{distance:U,point:p7.clone(),object:J}}function m7(J,$,Q,Z,W,Y,K,X,G,U){J.getVertexPosition(X,h7),J.getVertexPosition(G,b7),J.getVertexPosition(U,x7);let V=r$(J,$,Q,Z,h7,b7,x7,e9);if(V){let H=new T;if(v0.getBarycoord(e9,h7,b7,x7,H),W)V.uv=v0.getInterpolatedAttribute(W,X,G,U,H,new MJ);if(Y)V.uv1=v0.getInterpolatedAttribute(Y,X,G,U,H,new MJ);if(K){if(V.normal=v0.getInterpolatedAttribute(K,X,G,U,H,new T),V.normal.dot(Z.direction)>0)V.normal.multiplyScalar(-1)}let q={a:X,b:G,c:U,normal:new T,materialIndex:0};v0.getNormal(h7,b7,x7,q.normal),V.face=q,V.barycoord=H}return V}class T0 extends z0{constructor(J=1,$=1,Q=1,Z=1,W=1,Y=1){super();this.type="BoxGeometry",this.parameters={width:J,height:$,depth:Q,widthSegments:Z,heightSegments:W,depthSegments:Y};let K=this;Z=Math.floor(Z),W=Math.floor(W),Y=Math.floor(Y);let X=[],G=[],U=[],V=[],H=0,q=0;D("z","y","x",-1,-1,Q,$,J,Y,W,0),D("z","y","x",1,-1,Q,$,-J,Y,W,1),D("x","z","y",1,1,J,Q,$,Z,Y,2),D("x","z","y",1,-1,J,Q,-$,Z,Y,3),D("x","y","z",1,-1,J,$,Q,Z,W,4),D("x","y","z",-1,-1,J,$,-Q,Z,W,5),this.setIndex(X),this.setAttribute("position",new eJ(G,3)),this.setAttribute("normal",new eJ(U,3)),this.setAttribute("uv",new eJ(V,2));function D(A,O,F,E,_,N,C,f,k,w,b){let B=N/k,L=C/w,S=N/2,x=C/2,l=f/2,s=k+1,d=w+1,c=0,e=0,m=new T;for(let YJ=0;YJ<d;YJ++){let GJ=YJ*L-x;for(let wJ=0;wJ<s;wJ++){let pJ=wJ*B-S;m[A]=pJ*E,m[O]=GJ*_,m[F]=l,G.push(m.x,m.y,m.z),m[A]=0,m[O]=0,m[F]=f>0?1:-1,U.push(m.x,m.y,m.z),V.push(wJ/k),V.push(1-YJ/w),c+=1}}for(let YJ=0;YJ<w;YJ++)for(let GJ=0;GJ<k;GJ++){let wJ=H+GJ+s*YJ,pJ=H+GJ+s*(YJ+1),o=H+(GJ+1)+s*(YJ+1),JJ=H+(GJ+1)+s*YJ;X.push(wJ,pJ,JJ),X.push(pJ,o,JJ),e+=6}K.addGroup(q,e,b),q+=e,H+=c}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new T0(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}function J7(J){let $={};for(let Q in J){$[Q]={};for(let Z in J[Q]){let W=J[Q][Z];if(W&&(W.isColor||W.isMatrix3||W.isMatrix4||W.isVector2||W.isVector3||W.isVector4||W.isTexture||W.isQuaternion))if(W.isRenderTargetTexture)console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),$[Q][Z]=null;else $[Q][Z]=W.clone();else if(Array.isArray(W))$[Q][Z]=W.slice();else $[Q][Z]=W}}return $}function L0(J){let $={};for(let Q=0;Q<J.length;Q++){let Z=J7(J[Q]);for(let W in Z)$[W]=Z[W]}return $}function t$(J){let $=[];for(let Q=0;Q<J.length;Q++)$.push(J[Q].clone());return $}function c5(J){let $=J.getRenderTarget();if($===null)return J.outputColorSpace;if($.isXRRenderTarget===!0)return $.texture.colorSpace;return oJ.workingColorSpace}var e$={clone:J7,merge:L0},JQ=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,$Q=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Q6 extends y6{static get type(){return"ShaderMaterial"}constructor(J){super();if(this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=JQ,this.fragmentShader=$Q,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=J7(J.uniforms),this.uniformsGroups=t$(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this}toJSON(J){let $=super.toJSON(J);$.glslVersion=this.glslVersion,$.uniforms={};for(let Z in this.uniforms){let Y=this.uniforms[Z].value;if(Y&&Y.isTexture)$.uniforms[Z]={type:"t",value:Y.toJSON(J).uuid};else if(Y&&Y.isColor)$.uniforms[Z]={type:"c",value:Y.getHex()};else if(Y&&Y.isVector2)$.uniforms[Z]={type:"v2",value:Y.toArray()};else if(Y&&Y.isVector3)$.uniforms[Z]={type:"v3",value:Y.toArray()};else if(Y&&Y.isVector4)$.uniforms[Z]={type:"v4",value:Y.toArray()};else if(Y&&Y.isMatrix3)$.uniforms[Z]={type:"m3",value:Y.toArray()};else if(Y&&Y.isMatrix4)$.uniforms[Z]={type:"m4",value:Y.toArray()};else $.uniforms[Z]={value:Y}}if(Object.keys(this.defines).length>0)$.defines=this.defines;$.vertexShader=this.vertexShader,$.fragmentShader=this.fragmentShader,$.lights=this.lights,$.clipping=this.clipping;let Q={};for(let Z in this.extensions)if(this.extensions[Z]===!0)Q[Z]=!0;if(Object.keys(Q).length>0)$.extensions=Q;return $}}class X9 extends F0{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new K0,this.projectionMatrix=new K0,this.projectionMatrixInverse=new K0,this.coordinateSystem=2000}copy(J,$){return super.copy(J,$),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){super.updateMatrixWorld(J),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(J,$){super.updateWorldMatrix(J,$),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}var F6=new T,J5=new MJ,$5=new MJ;class y0 extends X9{constructor(J=50,$=1,Q=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=Q,this.far=Z,this.focus=10,this.aspect=$,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,$){return super.copy(J,$),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let $=0.5*this.getFilmHeight()/J;this.fov=t8*2*Math.atan($),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(M8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return t8*2*Math.atan(Math.tan(M8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,$,Q){F6.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(F6.x,F6.y).multiplyScalar(-J/F6.z),F6.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(F6.x,F6.y).multiplyScalar(-J/F6.z)}getViewSize(J,$){return this.getViewBounds(J,J5,$5),$.subVectors($5,J5)}setViewOffset(J,$,Q,Z,W,Y){if(this.aspect=J/$,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=$,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=W,this.view.height=Y,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,$=J*Math.tan(M8*0.5*this.fov)/this.zoom,Q=2*$,Z=this.aspect*Q,W=-0.5*Z,Y=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:X,fullHeight:G}=Y;W+=Y.offsetX*Z/X,$-=Y.offsetY*Q/G,Z*=Y.width/X,Q*=Y.height/G}let K=this.filmOffset;if(K!==0)W+=J*K/this.getFilmWidth();this.projectionMatrix.makePerspective(W,W+Z,$,$-Q,J,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let $=super.toJSON(J);if($.object.fov=this.fov,$.object.zoom=this.zoom,$.object.near=this.near,$.object.far=this.far,$.object.focus=this.focus,$.object.aspect=this.aspect,this.view!==null)$.object.view=Object.assign({},this.view);return $.object.filmGauge=this.filmGauge,$.object.filmOffset=this.filmOffset,$}}var c6=-90,n6=1;class n5 extends F0{constructor(J,$,Q){super();this.type="CubeCamera",this.renderTarget=Q,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new y0(c6,n6,J,$);Z.layers=this.layers,this.add(Z);let W=new y0(c6,n6,J,$);W.layers=this.layers,this.add(W);let Y=new y0(c6,n6,J,$);Y.layers=this.layers,this.add(Y);let K=new y0(c6,n6,J,$);K.layers=this.layers,this.add(K);let X=new y0(c6,n6,J,$);X.layers=this.layers,this.add(X);let G=new y0(c6,n6,J,$);G.layers=this.layers,this.add(G)}updateCoordinateSystem(){let J=this.coordinateSystem,$=this.children.concat(),[Q,Z,W,Y,K,X]=$;for(let G of $)this.remove(G);if(J===2000)Q.up.set(0,1,0),Q.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),W.up.set(0,0,-1),W.lookAt(0,1,0),Y.up.set(0,0,1),Y.lookAt(0,-1,0),K.up.set(0,1,0),K.lookAt(0,0,1),X.up.set(0,1,0),X.lookAt(0,0,-1);else if(J===2001)Q.up.set(0,-1,0),Q.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),W.up.set(0,0,1),W.lookAt(0,1,0),Y.up.set(0,0,-1),Y.lookAt(0,-1,0),K.up.set(0,-1,0),K.lookAt(0,0,1),X.up.set(0,-1,0),X.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let G of $)this.add(G),G.updateMatrixWorld()}update(J,$){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:Q,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[W,Y,K,X,G,U]=this.children,V=J.getRenderTarget(),H=J.getActiveCubeFace(),q=J.getActiveMipmapLevel(),D=J.xr.enabled;J.xr.enabled=!1;let A=Q.texture.generateMipmaps;Q.texture.generateMipmaps=!1,J.setRenderTarget(Q,0,Z),J.render($,W),J.setRenderTarget(Q,1,Z),J.render($,Y),J.setRenderTarget(Q,2,Z),J.render($,K),J.setRenderTarget(Q,3,Z),J.render($,X),J.setRenderTarget(Q,4,Z),J.render($,G),Q.texture.generateMipmaps=A,J.setRenderTarget(Q,5,Z),J.render($,U),J.setRenderTarget(V,H,q),J.xr.enabled=D,Q.texture.needsPMREMUpdate=!0}}class G9 extends _0{constructor(J,$,Q,Z,W,Y,K,X,G,U){J=J!==void 0?J:[],$=$!==void 0?$:301;super(J,$,Q,Z,W,Y,K,X,G,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class s5 extends N6{constructor(J=1,$={}){super(J,J,$);this.isWebGLCubeRenderTarget=!0;let Q={width:J,height:J,depth:1},Z=[Q,Q,Q,Q,Q,Q];this.texture=new G9(Z,$.mapping,$.wrapS,$.wrapT,$.magFilter,$.minFilter,$.format,$.type,$.anisotropy,$.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=$.generateMipmaps!==void 0?$.generateMipmaps:!1,this.texture.minFilter=$.minFilter!==void 0?$.minFilter:1006}fromEquirectangularTexture(J,$){this.texture.type=$.type,this.texture.colorSpace=$.colorSpace,this.texture.generateMipmaps=$.generateMipmaps,this.texture.minFilter=$.minFilter,this.texture.magFilter=$.magFilter;let Q={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},Z=new T0(5,5,5),W=new Q6({name:"CubemapFromEquirect",uniforms:J7(Q.uniforms),vertexShader:Q.vertexShader,fragmentShader:Q.fragmentShader,side:1,blending:0});W.uniforms.tEquirect.value=$;let Y=new PJ(Z,W),K=$.minFilter;if($.minFilter===1008)$.minFilter=1006;return new n5(1,10,this).update(J,Y),$.minFilter=K,Y.geometry.dispose(),Y.material.dispose(),this}clear(J,$,Q,Z){let W=J.getRenderTarget();for(let Y=0;Y<6;Y++)J.setRenderTarget(this,Y),J.clear($,Q,Z);J.setRenderTarget(W)}}var p8=new T,QQ=new T,ZQ=new gJ;class D6{constructor(J=new T(1,0,0),$=0){this.isPlane=!0,this.normal=J,this.constant=$}set(J,$){return this.normal.copy(J),this.constant=$,this}setComponents(J,$,Q,Z){return this.normal.set(J,$,Q),this.constant=Z,this}setFromNormalAndCoplanarPoint(J,$){return this.normal.copy(J),this.constant=-$.dot(this.normal),this}setFromCoplanarPoints(J,$,Q){let Z=p8.subVectors(Q,$).cross(QQ.subVectors(J,$)).normalize();return this.setFromNormalAndCoplanarPoint(Z,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,$){return $.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,$){let Q=J.delta(p8),Z=this.normal.dot(Q);if(Z===0){if(this.distanceToPoint(J.start)===0)return $.copy(J.start);return null}let W=-(J.start.dot(this.normal)+this.constant)/Z;if(W<0||W>1)return null;return $.copy(J.start).addScaledVector(Q,W)}intersectsLine(J){let $=this.distanceToPoint(J.start),Q=this.distanceToPoint(J.end);return $<0&&Q>0||Q<0&&$>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,$){let Q=$||ZQ.getNormalMatrix(J),Z=this.coplanarPoint(p8).applyMatrix4(J),W=this.normal.applyMatrix3(Q).normalize();return this.constant=-Z.dot(W),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}}var k6=new $8,u7=new T;class Z8{constructor(J=new D6,$=new D6,Q=new D6,Z=new D6,W=new D6,Y=new D6){this.planes=[J,$,Q,Z,W,Y]}set(J,$,Q,Z,W,Y){let K=this.planes;return K[0].copy(J),K[1].copy($),K[2].copy(Q),K[3].copy(Z),K[4].copy(W),K[5].copy(Y),this}copy(J){let $=this.planes;for(let Q=0;Q<6;Q++)$[Q].copy(J.planes[Q]);return this}setFromProjectionMatrix(J,$=2000){let Q=this.planes,Z=J.elements,W=Z[0],Y=Z[1],K=Z[2],X=Z[3],G=Z[4],U=Z[5],V=Z[6],H=Z[7],q=Z[8],D=Z[9],A=Z[10],O=Z[11],F=Z[12],E=Z[13],_=Z[14],N=Z[15];if(Q[0].setComponents(X-W,H-G,O-q,N-F).normalize(),Q[1].setComponents(X+W,H+G,O+q,N+F).normalize(),Q[2].setComponents(X+Y,H+U,O+D,N+E).normalize(),Q[3].setComponents(X-Y,H-U,O-D,N-E).normalize(),Q[4].setComponents(X-K,H-V,O-A,N-_).normalize(),$===2000)Q[5].setComponents(X+K,H+V,O+A,N+_).normalize();else if($===2001)Q[5].setComponents(K,V,A,_).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+$);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();k6.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let $=J.geometry;if($.boundingSphere===null)$.computeBoundingSphere();k6.copy($.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(k6)}intersectsSprite(J){return k6.center.set(0,0,0),k6.radius=0.7071067811865476,k6.applyMatrix4(J.matrixWorld),this.intersectsSphere(k6)}intersectsSphere(J){let $=this.planes,Q=J.center,Z=-J.radius;for(let W=0;W<6;W++)if($[W].distanceToPoint(Q)<Z)return!1;return!0}intersectsBox(J){let $=this.planes;for(let Q=0;Q<6;Q++){let Z=$[Q];if(u7.x=Z.normal.x>0?J.max.x:J.min.x,u7.y=Z.normal.y>0?J.max.y:J.min.y,u7.z=Z.normal.z>0?J.max.z:J.min.z,Z.distanceToPoint(u7)<0)return!1}return!0}containsPoint(J){let $=this.planes;for(let Q=0;Q<6;Q++)if($[Q].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function o5(){let J=null,$=!1,Q=null,Z=null;function W(Y,K){Q(Y,K),Z=J.requestAnimationFrame(W)}return{start:function(){if($===!0)return;if(Q===null)return;Z=J.requestAnimationFrame(W),$=!0},stop:function(){J.cancelAnimationFrame(Z),$=!1},setAnimationLoop:function(Y){Q=Y},setContext:function(Y){J=Y}}}function WQ(J){let $=new WeakMap;function Q(X,G){let{array:U,usage:V}=X,H=U.byteLength,q=J.createBuffer();J.bindBuffer(G,q),J.bufferData(G,U,V),X.onUploadCallback();let D;if(U instanceof Float32Array)D=J.FLOAT;else if(U instanceof Uint16Array)if(X.isFloat16BufferAttribute)D=J.HALF_FLOAT;else D=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)D=J.SHORT;else if(U instanceof Uint32Array)D=J.UNSIGNED_INT;else if(U instanceof Int32Array)D=J.INT;else if(U instanceof Int8Array)D=J.BYTE;else if(U instanceof Uint8Array)D=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)D=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:q,type:D,bytesPerElement:U.BYTES_PER_ELEMENT,version:X.version,size:H}}function Z(X,G,U){let{array:V,updateRanges:H}=G;if(J.bindBuffer(U,X),H.length===0)J.bufferSubData(U,0,V);else{H.sort((D,A)=>D.start-A.start);let q=0;for(let D=1;D<H.length;D++){let A=H[q],O=H[D];if(O.start<=A.start+A.count+1)A.count=Math.max(A.count,O.start+O.count-A.start);else++q,H[q]=O}H.length=q+1;for(let D=0,A=H.length;D<A;D++){let O=H[D];J.bufferSubData(U,O.start*V.BYTES_PER_ELEMENT,V,O.start,O.count)}G.clearUpdateRanges()}G.onUploadCallback()}function W(X){if(X.isInterleavedBufferAttribute)X=X.data;return $.get(X)}function Y(X){if(X.isInterleavedBufferAttribute)X=X.data;let G=$.get(X);if(G)J.deleteBuffer(G.buffer),$.delete(X)}function K(X,G){if(X.isInterleavedBufferAttribute)X=X.data;if(X.isGLBufferAttribute){let V=$.get(X);if(!V||V.version<X.version)$.set(X,{buffer:X.buffer,type:X.type,bytesPerElement:X.elementSize,version:X.version});return}let U=$.get(X);if(U===void 0)$.set(X,Q(X,G));else if(U.version<X.version){if(U.size!==X.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(U.buffer,X,G),U.version=X.version}}return{get:W,remove:Y,update:K}}class Z6 extends z0{constructor(J=1,$=1,Q=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:$,widthSegments:Q,heightSegments:Z};let W=J/2,Y=$/2,K=Math.floor(Q),X=Math.floor(Z),G=K+1,U=X+1,V=J/K,H=$/X,q=[],D=[],A=[],O=[];for(let F=0;F<U;F++){let E=F*H-Y;for(let _=0;_<G;_++){let N=_*V-W;D.push(N,-E,0),A.push(0,0,1),O.push(_/K),O.push(1-F/X)}}for(let F=0;F<X;F++)for(let E=0;E<K;E++){let _=E+G*F,N=E+G*(F+1),C=E+1+G*(F+1),f=E+1+G*F;q.push(_,N,f),q.push(N,C,f)}this.setIndex(q),this.setAttribute("position",new eJ(D,3)),this.setAttribute("normal",new eJ(A,3)),this.setAttribute("uv",new eJ(O,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new Z6(J.width,J.height,J.widthSegments,J.heightSegments)}}var YQ=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,KQ=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,XQ=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,GQ=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,UQ=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,HQ=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,VQ=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,qQ=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,EQ=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,FQ=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,DQ=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,RQ=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,NQ=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,OQ=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,MQ=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,BQ=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,AQ=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,LQ=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,_Q=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,zQ=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,kQ=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,CQ=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,wQ=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,IQ=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,TQ=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,PQ=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,SQ=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,yQ=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,vQ=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,jQ=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,fQ="gl_FragColor = linearToOutputTexel( gl_FragColor );",hQ=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,bQ=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,xQ=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,gQ=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,pQ=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,mQ=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,uQ=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,lQ=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,dQ=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,cQ=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,nQ=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,sQ=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,oQ=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,iQ=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,aQ=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,rQ=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,tQ=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,eQ=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,JZ=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,$Z=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,QZ=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ZZ=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,WZ=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,YZ=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,KZ=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,XZ=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,GZ=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,UZ=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,HZ=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,VZ=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,qZ=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,EZ=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,FZ=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,DZ=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,RZ=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,NZ=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,OZ=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,MZ=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,BZ=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,AZ=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,LZ=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,_Z=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,zZ=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kZ=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,CZ=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,wZ=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,IZ=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,TZ=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,PZ=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,SZ=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,yZ=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,vZ=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,jZ=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,fZ=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,hZ=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,bZ=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,xZ=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,gZ=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,pZ=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,mZ=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,uZ=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,lZ=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,dZ=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,cZ=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,nZ=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,sZ=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,oZ=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,iZ=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,aZ=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rZ=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,tZ=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,eZ=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,J4=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$4=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Q4=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Z4=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,W4=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Y4=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,K4=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,X4=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,G4=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,U4=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,H4=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,V4=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,q4=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,E4=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,F4=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,D4=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,R4=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,N4=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,O4=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,M4=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,B4=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,A4=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,L4=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,_4=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,z4=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,k4=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,C4=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,w4=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,I4=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,T4=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,P4=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,S4=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,y4=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,v4=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,j4=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,f4=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,h4=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,b4=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,uJ={alphahash_fragment:YQ,alphahash_pars_fragment:KQ,alphamap_fragment:XQ,alphamap_pars_fragment:GQ,alphatest_fragment:UQ,alphatest_pars_fragment:HQ,aomap_fragment:VQ,aomap_pars_fragment:qQ,batching_pars_vertex:EQ,batching_vertex:FQ,begin_vertex:DQ,beginnormal_vertex:RQ,bsdfs:NQ,iridescence_fragment:OQ,bumpmap_pars_fragment:MQ,clipping_planes_fragment:BQ,clipping_planes_pars_fragment:AQ,clipping_planes_pars_vertex:LQ,clipping_planes_vertex:_Q,color_fragment:zQ,color_pars_fragment:kQ,color_pars_vertex:CQ,color_vertex:wQ,common:IQ,cube_uv_reflection_fragment:TQ,defaultnormal_vertex:PQ,displacementmap_pars_vertex:SQ,displacementmap_vertex:yQ,emissivemap_fragment:vQ,emissivemap_pars_fragment:jQ,colorspace_fragment:fQ,colorspace_pars_fragment:hQ,envmap_fragment:bQ,envmap_common_pars_fragment:xQ,envmap_pars_fragment:gQ,envmap_pars_vertex:pQ,envmap_physical_pars_fragment:rQ,envmap_vertex:mQ,fog_vertex:uQ,fog_pars_vertex:lQ,fog_fragment:dQ,fog_pars_fragment:cQ,gradientmap_pars_fragment:nQ,lightmap_pars_fragment:sQ,lights_lambert_fragment:oQ,lights_lambert_pars_fragment:iQ,lights_pars_begin:aQ,lights_toon_fragment:tQ,lights_toon_pars_fragment:eQ,lights_phong_fragment:JZ,lights_phong_pars_fragment:$Z,lights_physical_fragment:QZ,lights_physical_pars_fragment:ZZ,lights_fragment_begin:WZ,lights_fragment_maps:YZ,lights_fragment_end:KZ,logdepthbuf_fragment:XZ,logdepthbuf_pars_fragment:GZ,logdepthbuf_pars_vertex:UZ,logdepthbuf_vertex:HZ,map_fragment:VZ,map_pars_fragment:qZ,map_particle_fragment:EZ,map_particle_pars_fragment:FZ,metalnessmap_fragment:DZ,metalnessmap_pars_fragment:RZ,morphinstance_vertex:NZ,morphcolor_vertex:OZ,morphnormal_vertex:MZ,morphtarget_pars_vertex:BZ,morphtarget_vertex:AZ,normal_fragment_begin:LZ,normal_fragment_maps:_Z,normal_pars_fragment:zZ,normal_pars_vertex:kZ,normal_vertex:CZ,normalmap_pars_fragment:wZ,clearcoat_normal_fragment_begin:IZ,clearcoat_normal_fragment_maps:TZ,clearcoat_pars_fragment:PZ,iridescence_pars_fragment:SZ,opaque_fragment:yZ,packing:vZ,premultiplied_alpha_fragment:jZ,project_vertex:fZ,dithering_fragment:hZ,dithering_pars_fragment:bZ,roughnessmap_fragment:xZ,roughnessmap_pars_fragment:gZ,shadowmap_pars_fragment:pZ,shadowmap_pars_vertex:mZ,shadowmap_vertex:uZ,shadowmask_pars_fragment:lZ,skinbase_vertex:dZ,skinning_pars_vertex:cZ,skinning_vertex:nZ,skinnormal_vertex:sZ,specularmap_fragment:oZ,specularmap_pars_fragment:iZ,tonemapping_fragment:aZ,tonemapping_pars_fragment:rZ,transmission_fragment:tZ,transmission_pars_fragment:eZ,uv_pars_fragment:J4,uv_pars_vertex:$4,uv_vertex:Q4,worldpos_vertex:Z4,background_vert:W4,background_frag:Y4,backgroundCube_vert:K4,backgroundCube_frag:X4,cube_vert:G4,cube_frag:U4,depth_vert:H4,depth_frag:V4,distanceRGBA_vert:q4,distanceRGBA_frag:E4,equirect_vert:F4,equirect_frag:D4,linedashed_vert:R4,linedashed_frag:N4,meshbasic_vert:O4,meshbasic_frag:M4,meshlambert_vert:B4,meshlambert_frag:A4,meshmatcap_vert:L4,meshmatcap_frag:_4,meshnormal_vert:z4,meshnormal_frag:k4,meshphong_vert:C4,meshphong_frag:w4,meshphysical_vert:I4,meshphysical_frag:T4,meshtoon_vert:P4,meshtoon_frag:S4,points_vert:y4,points_frag:v4,shadow_vert:j4,shadow_frag:f4,sprite_vert:h4,sprite_frag:b4},KJ={common:{diffuse:{value:new nJ(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new gJ},alphaMap:{value:null},alphaMapTransform:{value:new gJ},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new gJ}},envmap:{envMap:{value:null},envMapRotation:{value:new gJ},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new gJ}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new gJ}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new gJ},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new gJ},normalScale:{value:new MJ(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new gJ},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new gJ}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new gJ}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new gJ}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new nJ(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new nJ(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new gJ},alphaTest:{value:0},uvTransform:{value:new gJ}},sprite:{diffuse:{value:new nJ(16777215)},opacity:{value:1},center:{value:new MJ(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new gJ},alphaMap:{value:null},alphaMapTransform:{value:new gJ},alphaTest:{value:0}}},l0={basic:{uniforms:L0([KJ.common,KJ.specularmap,KJ.envmap,KJ.aomap,KJ.lightmap,KJ.fog]),vertexShader:uJ.meshbasic_vert,fragmentShader:uJ.meshbasic_frag},lambert:{uniforms:L0([KJ.common,KJ.specularmap,KJ.envmap,KJ.aomap,KJ.lightmap,KJ.emissivemap,KJ.bumpmap,KJ.normalmap,KJ.displacementmap,KJ.fog,KJ.lights,{emissive:{value:new nJ(0)}}]),vertexShader:uJ.meshlambert_vert,fragmentShader:uJ.meshlambert_frag},phong:{uniforms:L0([KJ.common,KJ.specularmap,KJ.envmap,KJ.aomap,KJ.lightmap,KJ.emissivemap,KJ.bumpmap,KJ.normalmap,KJ.displacementmap,KJ.fog,KJ.lights,{emissive:{value:new nJ(0)},specular:{value:new nJ(1118481)},shininess:{value:30}}]),vertexShader:uJ.meshphong_vert,fragmentShader:uJ.meshphong_frag},standard:{uniforms:L0([KJ.common,KJ.envmap,KJ.aomap,KJ.lightmap,KJ.emissivemap,KJ.bumpmap,KJ.normalmap,KJ.displacementmap,KJ.roughnessmap,KJ.metalnessmap,KJ.fog,KJ.lights,{emissive:{value:new nJ(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:uJ.meshphysical_vert,fragmentShader:uJ.meshphysical_frag},toon:{uniforms:L0([KJ.common,KJ.aomap,KJ.lightmap,KJ.emissivemap,KJ.bumpmap,KJ.normalmap,KJ.displacementmap,KJ.gradientmap,KJ.fog,KJ.lights,{emissive:{value:new nJ(0)}}]),vertexShader:uJ.meshtoon_vert,fragmentShader:uJ.meshtoon_frag},matcap:{uniforms:L0([KJ.common,KJ.bumpmap,KJ.normalmap,KJ.displacementmap,KJ.fog,{matcap:{value:null}}]),vertexShader:uJ.meshmatcap_vert,fragmentShader:uJ.meshmatcap_frag},points:{uniforms:L0([KJ.points,KJ.fog]),vertexShader:uJ.points_vert,fragmentShader:uJ.points_frag},dashed:{uniforms:L0([KJ.common,KJ.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:uJ.linedashed_vert,fragmentShader:uJ.linedashed_frag},depth:{uniforms:L0([KJ.common,KJ.displacementmap]),vertexShader:uJ.depth_vert,fragmentShader:uJ.depth_frag},normal:{uniforms:L0([KJ.common,KJ.bumpmap,KJ.normalmap,KJ.displacementmap,{opacity:{value:1}}]),vertexShader:uJ.meshnormal_vert,fragmentShader:uJ.meshnormal_frag},sprite:{uniforms:L0([KJ.sprite,KJ.fog]),vertexShader:uJ.sprite_vert,fragmentShader:uJ.sprite_frag},background:{uniforms:{uvTransform:{value:new gJ},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:uJ.background_vert,fragmentShader:uJ.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new gJ}},vertexShader:uJ.backgroundCube_vert,fragmentShader:uJ.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:uJ.cube_vert,fragmentShader:uJ.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:uJ.equirect_vert,fragmentShader:uJ.equirect_frag},distanceRGBA:{uniforms:L0([KJ.common,KJ.displacementmap,{referencePosition:{value:new T},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:uJ.distanceRGBA_vert,fragmentShader:uJ.distanceRGBA_frag},shadow:{uniforms:L0([KJ.lights,KJ.fog,{color:{value:new nJ(0)},opacity:{value:1}}]),vertexShader:uJ.shadow_vert,fragmentShader:uJ.shadow_frag}};l0.physical={uniforms:L0([l0.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new gJ},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new gJ},clearcoatNormalScale:{value:new MJ(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new gJ},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new gJ},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new gJ},sheen:{value:0},sheenColor:{value:new nJ(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new gJ},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new gJ},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new gJ},transmissionSamplerSize:{value:new MJ},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new gJ},attenuationDistance:{value:0},attenuationColor:{value:new nJ(0)},specularColor:{value:new nJ(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new gJ},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new gJ},anisotropyVector:{value:new MJ},anisotropyMap:{value:null},anisotropyMapTransform:{value:new gJ}}]),vertexShader:uJ.meshphysical_vert,fragmentShader:uJ.meshphysical_frag};var l7={r:0,b:0,g:0},C6=new c0,x4=new K0;function g4(J,$,Q,Z,W,Y,K){let X=new nJ(0),G=Y===!0?0:1,U,V,H=null,q=0,D=null;function A(_){let N=_.isScene===!0?_.background:null;if(N&&N.isTexture)N=(_.backgroundBlurriness>0?Q:$).get(N);return N}function O(_){let N=!1,C=A(_);if(C===null)E(X,G);else if(C&&C.isColor)E(C,1),N=!0;let f=J.xr.getEnvironmentBlendMode();if(f==="additive")Z.buffers.color.setClear(0,0,0,1,K);else if(f==="alpha-blend")Z.buffers.color.setClear(0,0,0,0,K);if(J.autoClear||N)Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function F(_,N){let C=A(N);if(C&&(C.isCubeTexture||C.mapping===306)){if(V===void 0)V=new PJ(new T0(1,1,1),new Q6({name:"BackgroundCubeMaterial",uniforms:J7(l0.backgroundCube.uniforms),vertexShader:l0.backgroundCube.vertexShader,fragmentShader:l0.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1})),V.geometry.deleteAttribute("normal"),V.geometry.deleteAttribute("uv"),V.onBeforeRender=function(f,k,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(V.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),W.update(V);if(C6.copy(N.backgroundRotation),C6.x*=-1,C6.y*=-1,C6.z*=-1,C.isCubeTexture&&C.isRenderTargetTexture===!1)C6.y*=-1,C6.z*=-1;if(V.material.uniforms.envMap.value=C,V.material.uniforms.flipEnvMap.value=C.isCubeTexture&&C.isRenderTargetTexture===!1?-1:1,V.material.uniforms.backgroundBlurriness.value=N.backgroundBlurriness,V.material.uniforms.backgroundIntensity.value=N.backgroundIntensity,V.material.uniforms.backgroundRotation.value.setFromMatrix4(x4.makeRotationFromEuler(C6)),V.material.toneMapped=oJ.getTransfer(C.colorSpace)!=="srgb",H!==C||q!==C.version||D!==J.toneMapping)V.material.needsUpdate=!0,H=C,q=C.version,D=J.toneMapping;V.layers.enableAll(),_.unshift(V,V.geometry,V.material,0,0,null)}else if(C&&C.isTexture){if(U===void 0)U=new PJ(new Z6(2,2),new Q6({name:"BackgroundMaterial",uniforms:J7(l0.background.uniforms),vertexShader:l0.background.vertexShader,fragmentShader:l0.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1})),U.geometry.deleteAttribute("normal"),Object.defineProperty(U.material,"map",{get:function(){return this.uniforms.t2D.value}}),W.update(U);if(U.material.uniforms.t2D.value=C,U.material.uniforms.backgroundIntensity.value=N.backgroundIntensity,U.material.toneMapped=oJ.getTransfer(C.colorSpace)!=="srgb",C.matrixAutoUpdate===!0)C.updateMatrix();if(U.material.uniforms.uvTransform.value.copy(C.matrix),H!==C||q!==C.version||D!==J.toneMapping)U.material.needsUpdate=!0,H=C,q=C.version,D=J.toneMapping;U.layers.enableAll(),_.unshift(U,U.geometry,U.material,0,0,null)}}function E(_,N){_.getRGB(l7,c5(J)),Z.buffers.color.setClear(l7.r,l7.g,l7.b,N,K)}return{getClearColor:function(){return X},setClearColor:function(_,N=1){X.set(_),G=N,E(X,G)},getClearAlpha:function(){return G},setClearAlpha:function(_){G=_,E(X,G)},render:O,addToRenderList:F}}function p4(J,$){let Q=J.getParameter(J.MAX_VERTEX_ATTRIBS),Z={},W=q(null),Y=W,K=!1;function X(L,S,x,l,s){let d=!1,c=H(l,x,S);if(Y!==c)Y=c,U(Y.object);if(d=D(L,l,x,s),d)A(L,l,x,s);if(s!==null)$.update(s,J.ELEMENT_ARRAY_BUFFER);if(d||K){if(K=!1,C(L,S,x,l),s!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,$.get(s).buffer)}}function G(){return J.createVertexArray()}function U(L){return J.bindVertexArray(L)}function V(L){return J.deleteVertexArray(L)}function H(L,S,x){let l=x.wireframe===!0,s=Z[L.id];if(s===void 0)s={},Z[L.id]=s;let d=s[S.id];if(d===void 0)d={},s[S.id]=d;let c=d[l];if(c===void 0)c=q(G()),d[l]=c;return c}function q(L){let S=[],x=[],l=[];for(let s=0;s<Q;s++)S[s]=0,x[s]=0,l[s]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:S,enabledAttributes:x,attributeDivisors:l,object:L,attributes:{},index:null}}function D(L,S,x,l){let s=Y.attributes,d=S.attributes,c=0,e=x.getAttributes();for(let m in e)if(e[m].location>=0){let GJ=s[m],wJ=d[m];if(wJ===void 0){if(m==="instanceMatrix"&&L.instanceMatrix)wJ=L.instanceMatrix;if(m==="instanceColor"&&L.instanceColor)wJ=L.instanceColor}if(GJ===void 0)return!0;if(GJ.attribute!==wJ)return!0;if(wJ&&GJ.data!==wJ.data)return!0;c++}if(Y.attributesNum!==c)return!0;if(Y.index!==l)return!0;return!1}function A(L,S,x,l){let s={},d=S.attributes,c=0,e=x.getAttributes();for(let m in e)if(e[m].location>=0){let GJ=d[m];if(GJ===void 0){if(m==="instanceMatrix"&&L.instanceMatrix)GJ=L.instanceMatrix;if(m==="instanceColor"&&L.instanceColor)GJ=L.instanceColor}let wJ={};if(wJ.attribute=GJ,GJ&&GJ.data)wJ.data=GJ.data;s[m]=wJ,c++}Y.attributes=s,Y.attributesNum=c,Y.index=l}function O(){let L=Y.newAttributes;for(let S=0,x=L.length;S<x;S++)L[S]=0}function F(L){E(L,0)}function E(L,S){let{newAttributes:x,enabledAttributes:l,attributeDivisors:s}=Y;if(x[L]=1,l[L]===0)J.enableVertexAttribArray(L),l[L]=1;if(s[L]!==S)J.vertexAttribDivisor(L,S),s[L]=S}function _(){let{newAttributes:L,enabledAttributes:S}=Y;for(let x=0,l=S.length;x<l;x++)if(S[x]!==L[x])J.disableVertexAttribArray(x),S[x]=0}function N(L,S,x,l,s,d,c){if(c===!0)J.vertexAttribIPointer(L,S,x,s,d);else J.vertexAttribPointer(L,S,x,l,s,d)}function C(L,S,x,l){O();let s=l.attributes,d=x.getAttributes(),c=S.defaultAttributeValues;for(let e in d){let m=d[e];if(m.location>=0){let YJ=s[e];if(YJ===void 0){if(e==="instanceMatrix"&&L.instanceMatrix)YJ=L.instanceMatrix;if(e==="instanceColor"&&L.instanceColor)YJ=L.instanceColor}if(YJ!==void 0){let{normalized:GJ,itemSize:wJ}=YJ,pJ=$.get(YJ);if(pJ===void 0)continue;let{buffer:o,type:JJ,bytesPerElement:IJ}=pJ,SJ=JJ===J.INT||JJ===J.UNSIGNED_INT||YJ.gpuType===1013;if(YJ.isInterleavedBufferAttribute){let I=YJ.data,FJ=I.stride,kJ=YJ.offset;if(I.isInstancedInterleavedBuffer){for(let BJ=0;BJ<m.locationSize;BJ++)E(m.location+BJ,I.meshPerAttribute);if(L.isInstancedMesh!==!0&&l._maxInstanceCount===void 0)l._maxInstanceCount=I.meshPerAttribute*I.count}else for(let BJ=0;BJ<m.locationSize;BJ++)F(m.location+BJ);J.bindBuffer(J.ARRAY_BUFFER,o);for(let BJ=0;BJ<m.locationSize;BJ++)N(m.location+BJ,wJ/m.locationSize,JJ,GJ,FJ*IJ,(kJ+wJ/m.locationSize*BJ)*IJ,SJ)}else{if(YJ.isInstancedBufferAttribute){for(let I=0;I<m.locationSize;I++)E(m.location+I,YJ.meshPerAttribute);if(L.isInstancedMesh!==!0&&l._maxInstanceCount===void 0)l._maxInstanceCount=YJ.meshPerAttribute*YJ.count}else for(let I=0;I<m.locationSize;I++)F(m.location+I);J.bindBuffer(J.ARRAY_BUFFER,o);for(let I=0;I<m.locationSize;I++)N(m.location+I,wJ/m.locationSize,JJ,GJ,wJ*IJ,wJ/m.locationSize*I*IJ,SJ)}}else if(c!==void 0){let GJ=c[e];if(GJ!==void 0)switch(GJ.length){case 2:J.vertexAttrib2fv(m.location,GJ);break;case 3:J.vertexAttrib3fv(m.location,GJ);break;case 4:J.vertexAttrib4fv(m.location,GJ);break;default:J.vertexAttrib1fv(m.location,GJ)}}}}_()}function f(){b();for(let L in Z){let S=Z[L];for(let x in S){let l=S[x];for(let s in l)V(l[s].object),delete l[s];delete S[x]}delete Z[L]}}function k(L){if(Z[L.id]===void 0)return;let S=Z[L.id];for(let x in S){let l=S[x];for(let s in l)V(l[s].object),delete l[s];delete S[x]}delete Z[L.id]}function w(L){for(let S in Z){let x=Z[S];if(x[L.id]===void 0)continue;let l=x[L.id];for(let s in l)V(l[s].object),delete l[s];delete x[L.id]}}function b(){if(B(),K=!0,Y===W)return;Y=W,U(Y.object)}function B(){W.geometry=null,W.program=null,W.wireframe=!1}return{setup:X,reset:b,resetDefaultState:B,dispose:f,releaseStatesOfGeometry:k,releaseStatesOfProgram:w,initAttributes:O,enableAttribute:F,disableUnusedAttributes:_}}function m4(J,$,Q){let Z;function W(U){Z=U}function Y(U,V){J.drawArrays(Z,U,V),Q.update(V,Z,1)}function K(U,V,H){if(H===0)return;J.drawArraysInstanced(Z,U,V,H),Q.update(V,Z,H)}function X(U,V,H){if(H===0)return;$.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,U,0,V,0,H);let D=0;for(let A=0;A<H;A++)D+=V[A];Q.update(D,Z,1)}function G(U,V,H,q){if(H===0)return;let D=$.get("WEBGL_multi_draw");if(D===null)for(let A=0;A<U.length;A++)K(U[A],V[A],q[A]);else{D.multiDrawArraysInstancedWEBGL(Z,U,0,V,0,q,0,H);let A=0;for(let O=0;O<H;O++)A+=V[O]*q[O];Q.update(A,Z,1)}}this.setMode=W,this.render=Y,this.renderInstances=K,this.renderMultiDraw=X,this.renderMultiDrawInstances=G}function u4(J,$,Q,Z){let W;function Y(){if(W!==void 0)return W;if($.has("EXT_texture_filter_anisotropic")===!0){let w=$.get("EXT_texture_filter_anisotropic");W=J.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else W=0;return W}function K(w){if(w!==1023&&Z.convert(w)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function X(w){let b=w===1016&&($.has("EXT_color_buffer_half_float")||$.has("EXT_color_buffer_float"));if(w!==1009&&Z.convert(w)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==1015&&!b)return!1;return!0}function G(w){if(w==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";w="mediump"}if(w==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=Q.precision!==void 0?Q.precision:"highp",V=G(U);if(V!==U)console.warn("THREE.WebGLRenderer:",U,"not supported, using",V,"instead."),U=V;let H=Q.logarithmicDepthBuffer===!0,q=Q.reverseDepthBuffer===!0&&$.has("EXT_clip_control"),D=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),A=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),O=J.getParameter(J.MAX_TEXTURE_SIZE),F=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),E=J.getParameter(J.MAX_VERTEX_ATTRIBS),_=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),N=J.getParameter(J.MAX_VARYING_VECTORS),C=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),f=A>0,k=J.getParameter(J.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:Y,getMaxPrecision:G,textureFormatReadable:K,textureTypeReadable:X,precision:U,logarithmicDepthBuffer:H,reverseDepthBuffer:q,maxTextures:D,maxVertexTextures:A,maxTextureSize:O,maxCubemapSize:F,maxAttributes:E,maxVertexUniforms:_,maxVaryings:N,maxFragmentUniforms:C,vertexTextures:f,maxSamples:k}}function l4(J){let $=this,Q=null,Z=0,W=!1,Y=!1,K=new D6,X=new gJ,G={value:null,needsUpdate:!1};this.uniform=G,this.numPlanes=0,this.numIntersection=0,this.init=function(H,q){let D=H.length!==0||q||Z!==0||W;return W=q,Z=H.length,D},this.beginShadows=function(){Y=!0,V(null)},this.endShadows=function(){Y=!1},this.setGlobalState=function(H,q){Q=V(H,q,0)},this.setState=function(H,q,D){let{clippingPlanes:A,clipIntersection:O,clipShadows:F}=H,E=J.get(H);if(!W||A===null||A.length===0||Y&&!F)if(Y)V(null);else U();else{let _=Y?0:Z,N=_*4,C=E.clippingState||null;G.value=C,C=V(A,q,N,D);for(let f=0;f!==N;++f)C[f]=Q[f];E.clippingState=C,this.numIntersection=O?this.numPlanes:0,this.numPlanes+=_}};function U(){if(G.value!==Q)G.value=Q,G.needsUpdate=Z>0;$.numPlanes=Z,$.numIntersection=0}function V(H,q,D,A){let O=H!==null?H.length:0,F=null;if(O!==0){if(F=G.value,A!==!0||F===null){let E=D+O*4,_=q.matrixWorldInverse;if(X.getNormalMatrix(_),F===null||F.length<E)F=new Float32Array(E);for(let N=0,C=D;N!==O;++N,C+=4)K.copy(H[N]).applyMatrix4(_,X),K.normal.toArray(F,C),F[C+3]=K.constant}G.value=F,G.needsUpdate=!0}return $.numPlanes=O,$.numIntersection=0,F}}function d4(J){let $=new WeakMap;function Q(K,X){if(X===303)K.mapping=301;else if(X===304)K.mapping=302;return K}function Z(K){if(K&&K.isTexture){let X=K.mapping;if(X===303||X===304)if($.has(K)){let G=$.get(K).texture;return Q(G,K.mapping)}else{let G=K.image;if(G&&G.height>0){let U=new s5(G.height);return U.fromEquirectangularTexture(J,K),$.set(K,U),K.addEventListener("dispose",W),Q(U.texture,K.mapping)}else return null}}return K}function W(K){let X=K.target;X.removeEventListener("dispose",W);let G=$.get(X);if(G!==void 0)$.delete(X),G.dispose()}function Y(){$=new WeakMap}return{get:Z,dispose:Y}}class L7 extends X9{constructor(J=-1,$=1,Q=1,Z=-1,W=0.1,Y=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=$,this.top=Q,this.bottom=Z,this.near=W,this.far=Y,this.updateProjectionMatrix()}copy(J,$){return super.copy(J,$),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,$,Q,Z,W,Y){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=$,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=W,this.view.height=Y,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),$=(this.top-this.bottom)/(2*this.zoom),Q=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,W=Q-J,Y=Q+J,K=Z+$,X=Z-$;if(this.view!==null&&this.view.enabled){let G=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;W+=G*this.view.offsetX,Y=W+G*this.view.width,K-=U*this.view.offsetY,X=K-U*this.view.height}this.projectionMatrix.makeOrthographic(W,Y,K,X,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let $=super.toJSON(J);if($.object.zoom=this.zoom,$.object.left=this.left,$.object.right=this.right,$.object.top=this.top,$.object.bottom=this.bottom,$.object.near=this.near,$.object.far=this.far,this.view!==null)$.object.view=Object.assign({},this.view);return $}}var t6=4,Q5=[0.125,0.215,0.35,0.446,0.526,0.582],T6=20,m8=new L7,Z5=new nJ,u8=null,l8=0,d8=0,c8=!1,I6=(1+Math.sqrt(5))/2,s6=1/I6,W5=[new T(-I6,s6,0),new T(I6,s6,0),new T(-s6,0,I6),new T(s6,0,I6),new T(0,I6,-s6),new T(0,I6,s6),new T(-1,1,-1),new T(1,1,-1),new T(-1,1,1),new T(1,1,1)];class e8{constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(J,$=0,Q=0.1,Z=100){u8=this._renderer.getRenderTarget(),l8=this._renderer.getActiveCubeFace(),d8=this._renderer.getActiveMipmapLevel(),c8=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let W=this._allocateTargets();if(W.depthBuffer=!0,this._sceneToCubeUV(J,Q,Z,W),$>0)this._blur(W,0,0,$);return this._applyPMREM(W),this._cleanup(W),W}fromEquirectangular(J,$=null){return this._fromTexture(J,$)}fromCubemap(J,$=null){return this._fromTexture(J,$)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=X5(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=K5(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodPlanes.length;J++)this._lodPlanes[J].dispose()}_cleanup(J){this._renderer.setRenderTarget(u8,l8,d8),this._renderer.xr.enabled=c8,J.scissorTest=!1,d7(J,0,0,J.width,J.height)}_fromTexture(J,$){if(J.mapping===301||J.mapping===302)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);u8=this._renderer.getRenderTarget(),l8=this._renderer.getActiveCubeFace(),d8=this._renderer.getActiveMipmapLevel(),c8=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let Q=$||this._allocateTargets();return this._textureToCubeUV(J,Q),this._applyPMREM(Q),this._cleanup(Q),Q}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),$=4*this._cubeSize,Q={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:"srgb-linear",depthBuffer:!1},Z=Y5(J,$,Q);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==$){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=Y5(J,$,Q);let{_lodMax:W}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=c4(W)),this._blurMaterial=n4(W,J,$)}return Z}_compileMaterial(J){let $=new PJ(this._lodPlanes[0],J);this._renderer.compile($,m8)}_sceneToCubeUV(J,$,Q,Z){let K=new y0(90,1,$,Q),X=[1,-1,1,1,1,1],G=[1,1,1,-1,-1,-1],U=this._renderer,V=U.autoClear,H=U.toneMapping;U.getClearColor(Z5),U.toneMapping=0,U.autoClear=!1;let q=new M6({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),D=new PJ(new T0,q),A=!1,O=J.background;if(O){if(O.isColor)q.color.copy(O),J.background=null,A=!0}else q.color.copy(Z5),A=!0;for(let F=0;F<6;F++){let E=F%3;if(E===0)K.up.set(0,X[F],0),K.lookAt(G[F],0,0);else if(E===1)K.up.set(0,0,X[F]),K.lookAt(0,G[F],0);else K.up.set(0,X[F],0),K.lookAt(0,0,G[F]);let _=this._cubeSize;if(d7(Z,E*_,F>2?_:0,_,_),U.setRenderTarget(Z),A)U.render(D,K);U.render(J,K)}D.geometry.dispose(),D.material.dispose(),U.toneMapping=H,U.autoClear=V,J.background=O}_textureToCubeUV(J,$){let Q=this._renderer,Z=J.mapping===301||J.mapping===302;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=X5();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=K5();let W=Z?this._cubemapMaterial:this._equirectMaterial,Y=new PJ(this._lodPlanes[0],W),K=W.uniforms;K.envMap.value=J;let X=this._cubeSize;d7($,0,0,3*X,2*X),Q.setRenderTarget($),Q.render(Y,m8)}_applyPMREM(J){let $=this._renderer,Q=$.autoClear;$.autoClear=!1;let Z=this._lodPlanes.length;for(let W=1;W<Z;W++){let Y=Math.sqrt(this._sigmas[W]*this._sigmas[W]-this._sigmas[W-1]*this._sigmas[W-1]),K=W5[(Z-W-1)%W5.length];this._blur(J,W-1,W,Y,K)}$.autoClear=Q}_blur(J,$,Q,Z,W){let Y=this._pingPongRenderTarget;this._halfBlur(J,Y,$,Q,Z,"latitudinal",W),this._halfBlur(Y,J,Q,Q,Z,"longitudinal",W)}_halfBlur(J,$,Q,Z,W,Y,K){let X=this._renderer,G=this._blurMaterial;if(Y!=="latitudinal"&&Y!=="longitudinal")console.error("blur direction must be either latitudinal or longitudinal!");let U=3,V=new PJ(this._lodPlanes[Z],G),H=G.uniforms,q=this._sizeLods[Q]-1,D=isFinite(W)?Math.PI/(2*q):2*Math.PI/(2*T6-1),A=W/D,O=isFinite(W)?1+Math.floor(U*A):T6;if(O>T6)console.warn(`sigmaRadians, ${W}, is too large and will clip, as it requested ${O} samples when the maximum is set to ${T6}`);let F=[],E=0;for(let k=0;k<T6;++k){let w=k/A,b=Math.exp(-w*w/2);if(F.push(b),k===0)E+=b;else if(k<O)E+=2*b}for(let k=0;k<F.length;k++)F[k]=F[k]/E;if(H.envMap.value=J.texture,H.samples.value=O,H.weights.value=F,H.latitudinal.value=Y==="latitudinal",K)H.poleAxis.value=K;let{_lodMax:_}=this;H.dTheta.value=D,H.mipInt.value=_-Q;let N=this._sizeLods[Z],C=3*N*(Z>_-t6?Z-_+t6:0),f=4*(this._cubeSize-N);d7($,C,f,3*N,2*N),X.setRenderTarget($),X.render(V,m8)}}function c4(J){let $=[],Q=[],Z=[],W=J,Y=J-t6+1+Q5.length;for(let K=0;K<Y;K++){let X=Math.pow(2,W);Q.push(X);let G=1/X;if(K>J-t6)G=Q5[K-J+t6-1];else if(K===0)G=0;Z.push(G);let U=1/(X-2),V=-U,H=1+U,q=[V,V,H,V,H,H,V,V,H,H,V,H],D=6,A=6,O=3,F=2,E=1,_=new Float32Array(O*A*D),N=new Float32Array(F*A*D),C=new Float32Array(E*A*D);for(let k=0;k<D;k++){let w=k%3*2/3-1,b=k>2?0:-1,B=[w,b,0,w+0.6666666666666666,b,0,w+0.6666666666666666,b+1,0,w,b,0,w+0.6666666666666666,b+1,0,w,b+1,0];_.set(B,O*A*k),N.set(q,F*A*k);let L=[k,k,k,k,k,k];C.set(L,E*A*k)}let f=new z0;if(f.setAttribute("position",new j0(_,O)),f.setAttribute("uv",new j0(N,F)),f.setAttribute("faceIndex",new j0(C,E)),$.push(f),W>t6)W--}return{lodPlanes:$,sizeLods:Q,sigmas:Z}}function Y5(J,$,Q){let Z=new N6(J,$,Q);return Z.texture.mapping=306,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function d7(J,$,Q,Z,W){J.viewport.set($,Q,Z,W),J.scissor.set($,Q,Z,W)}function n4(J,$,Q){let Z=new Float32Array(T6),W=new T(0,1,0);return new Q6({name:"SphericalGaussianBlur",defines:{n:T6,CUBEUV_TEXEL_WIDTH:1/$,CUBEUV_TEXEL_HEIGHT:1/Q,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:Z},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:W}},vertexShader:U9(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function K5(){return new Q6({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:U9(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function X5(){return new Q6({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:U9(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function U9(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function s4(J){let $=new WeakMap,Q=null;function Z(X){if(X&&X.isTexture){let G=X.mapping,U=G===303||G===304,V=G===301||G===302;if(U||V){let H=$.get(X),q=H!==void 0?H.texture.pmremVersion:0;if(X.isRenderTargetTexture&&X.pmremVersion!==q){if(Q===null)Q=new e8(J);return H=U?Q.fromEquirectangular(X,H):Q.fromCubemap(X,H),H.texture.pmremVersion=X.pmremVersion,$.set(X,H),H.texture}else if(H!==void 0)return H.texture;else{let D=X.image;if(U&&D&&D.height>0||V&&D&&W(D)){if(Q===null)Q=new e8(J);return H=U?Q.fromEquirectangular(X):Q.fromCubemap(X),H.texture.pmremVersion=X.pmremVersion,$.set(X,H),X.addEventListener("dispose",Y),H.texture}else return null}}}return X}function W(X){let G=0,U=6;for(let V=0;V<U;V++)if(X[V]!==void 0)G++;return G===U}function Y(X){let G=X.target;G.removeEventListener("dispose",Y);let U=$.get(G);if(U!==void 0)$.delete(G),U.dispose()}function K(){if($=new WeakMap,Q!==null)Q.dispose(),Q=null}return{get:Z,dispose:K}}function o4(J){let $={};function Q(Z){if($[Z]!==void 0)return $[Z];let W;switch(Z){case"WEBGL_depth_texture":W=J.getExtension("WEBGL_depth_texture")||J.getExtension("MOZ_WEBGL_depth_texture")||J.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":W=J.getExtension("EXT_texture_filter_anisotropic")||J.getExtension("MOZ_EXT_texture_filter_anisotropic")||J.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":W=J.getExtension("WEBGL_compressed_texture_s3tc")||J.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||J.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":W=J.getExtension("WEBGL_compressed_texture_pvrtc")||J.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:W=J.getExtension(Z)}return $[Z]=W,W}return{has:function(Z){return Q(Z)!==null},init:function(){Q("EXT_color_buffer_float"),Q("WEBGL_clip_cull_distance"),Q("OES_texture_float_linear"),Q("EXT_color_buffer_half_float"),Q("WEBGL_multisampled_render_to_texture"),Q("WEBGL_render_shared_exponent")},get:function(Z){let W=Q(Z);if(W===null)N7("THREE.WebGLRenderer: "+Z+" extension not supported.");return W}}}function i4(J,$,Q,Z){let W={},Y=new WeakMap;function K(H){let q=H.target;if(q.index!==null)$.remove(q.index);for(let A in q.attributes)$.remove(q.attributes[A]);for(let A in q.morphAttributes){let O=q.morphAttributes[A];for(let F=0,E=O.length;F<E;F++)$.remove(O[F])}q.removeEventListener("dispose",K),delete W[q.id];let D=Y.get(q);if(D)$.remove(D),Y.delete(q);if(Z.releaseStatesOfGeometry(q),q.isInstancedBufferGeometry===!0)delete q._maxInstanceCount;Q.memory.geometries--}function X(H,q){if(W[q.id]===!0)return q;return q.addEventListener("dispose",K),W[q.id]=!0,Q.memory.geometries++,q}function G(H){let q=H.attributes;for(let A in q)$.update(q[A],J.ARRAY_BUFFER);let D=H.morphAttributes;for(let A in D){let O=D[A];for(let F=0,E=O.length;F<E;F++)$.update(O[F],J.ARRAY_BUFFER)}}function U(H){let q=[],D=H.index,A=H.attributes.position,O=0;if(D!==null){let _=D.array;O=D.version;for(let N=0,C=_.length;N<C;N+=3){let f=_[N+0],k=_[N+1],w=_[N+2];q.push(f,k,k,w,w,f)}}else if(A!==void 0){let _=A.array;O=A.version;for(let N=0,C=_.length/3-1;N<C;N+=3){let f=N+0,k=N+1,w=N+2;q.push(f,k,k,w,w,f)}}else return;let F=new((p5(q))?K9:Y9)(q,1);F.version=O;let E=Y.get(H);if(E)$.remove(E);Y.set(H,F)}function V(H){let q=Y.get(H);if(q){let D=H.index;if(D!==null){if(q.version<D.version)U(H)}}else U(H);return Y.get(H)}return{get:X,update:G,getWireframeAttribute:V}}function a4(J,$,Q){let Z;function W(q){Z=q}let Y,K;function X(q){Y=q.type,K=q.bytesPerElement}function G(q,D){J.drawElements(Z,D,Y,q*K),Q.update(D,Z,1)}function U(q,D,A){if(A===0)return;J.drawElementsInstanced(Z,D,Y,q*K,A),Q.update(D,Z,A)}function V(q,D,A){if(A===0)return;$.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,D,0,Y,q,0,A);let F=0;for(let E=0;E<A;E++)F+=D[E];Q.update(F,Z,1)}function H(q,D,A,O){if(A===0)return;let F=$.get("WEBGL_multi_draw");if(F===null)for(let E=0;E<q.length;E++)U(q[E]/K,D[E],O[E]);else{F.multiDrawElementsInstancedWEBGL(Z,D,0,Y,q,0,O,0,A);let E=0;for(let _=0;_<A;_++)E+=D[_]*O[_];Q.update(E,Z,1)}}this.setMode=W,this.setIndex=X,this.render=G,this.renderInstances=U,this.renderMultiDraw=V,this.renderMultiDrawInstances=H}function r4(J){let $={geometries:0,textures:0},Q={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(Y,K,X){switch(Q.calls++,K){case J.TRIANGLES:Q.triangles+=X*(Y/3);break;case J.LINES:Q.lines+=X*(Y/2);break;case J.LINE_STRIP:Q.lines+=X*(Y-1);break;case J.LINE_LOOP:Q.lines+=X*Y;break;case J.POINTS:Q.points+=X*Y;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",K);break}}function W(){Q.calls=0,Q.triangles=0,Q.points=0,Q.lines=0}return{memory:$,render:Q,programs:null,autoReset:!0,reset:W,update:Z}}function t4(J,$,Q){let Z=new WeakMap,W=new U0;function Y(K,X,G){let U=K.morphTargetInfluences,V=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,H=V!==void 0?V.length:0,q=Z.get(X);if(q===void 0||q.count!==H){let B=function(){w.dispose(),Z.delete(X),X.removeEventListener("dispose",B)};if(q!==void 0)q.texture.dispose();let D=X.morphAttributes.position!==void 0,A=X.morphAttributes.normal!==void 0,O=X.morphAttributes.color!==void 0,F=X.morphAttributes.position||[],E=X.morphAttributes.normal||[],_=X.morphAttributes.color||[],N=0;if(D===!0)N=1;if(A===!0)N=2;if(O===!0)N=3;let C=X.attributes.position.count*N,f=1;if(C>$.maxTextureSize)f=Math.ceil(C/$.maxTextureSize),C=$.maxTextureSize;let k=new Float32Array(C*f*4*H),w=new Z9(k,C,f,H);w.type=1015,w.needsUpdate=!0;let b=N*4;for(let L=0;L<H;L++){let S=F[L],x=E[L],l=_[L],s=C*f*4*L;for(let d=0;d<S.count;d++){let c=d*b;if(D===!0)W.fromBufferAttribute(S,d),k[s+c+0]=W.x,k[s+c+1]=W.y,k[s+c+2]=W.z,k[s+c+3]=0;if(A===!0)W.fromBufferAttribute(x,d),k[s+c+4]=W.x,k[s+c+5]=W.y,k[s+c+6]=W.z,k[s+c+7]=0;if(O===!0)W.fromBufferAttribute(l,d),k[s+c+8]=W.x,k[s+c+9]=W.y,k[s+c+10]=W.z,k[s+c+11]=l.itemSize===4?W.w:1}}q={count:H,texture:w,size:new MJ(C,f)},Z.set(X,q),X.addEventListener("dispose",B)}if(K.isInstancedMesh===!0&&K.morphTexture!==null)G.getUniforms().setValue(J,"morphTexture",K.morphTexture,Q);else{let D=0;for(let O=0;O<U.length;O++)D+=U[O];let A=X.morphTargetsRelative?1:1-D;G.getUniforms().setValue(J,"morphTargetBaseInfluence",A),G.getUniforms().setValue(J,"morphTargetInfluences",U)}G.getUniforms().setValue(J,"morphTargetsTexture",q.texture,Q),G.getUniforms().setValue(J,"morphTargetsTextureSize",q.size)}return{update:Y}}function e4(J,$,Q,Z){let W=new WeakMap;function Y(G){let U=Z.render.frame,V=G.geometry,H=$.get(G,V);if(W.get(H)!==U)$.update(H),W.set(H,U);if(G.isInstancedMesh){if(G.hasEventListener("dispose",X)===!1)G.addEventListener("dispose",X);if(W.get(G)!==U){if(Q.update(G.instanceMatrix,J.ARRAY_BUFFER),G.instanceColor!==null)Q.update(G.instanceColor,J.ARRAY_BUFFER);W.set(G,U)}}if(G.isSkinnedMesh){let q=G.skeleton;if(W.get(q)!==U)q.update(),W.set(q,U)}return H}function K(){W=new WeakMap}function X(G){let U=G.target;if(U.removeEventListener("dispose",X),Q.remove(U.instanceMatrix),U.instanceColor!==null)Q.remove(U.instanceColor)}return{update:Y,dispose:K}}class H9 extends _0{constructor(J,$,Q,Z,W,Y,K,X,G,U=1026){if(U!==1026&&U!==1027)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");if(Q===void 0&&U===1026)Q=1014;if(Q===void 0&&U===1027)Q=1020;super(null,Z,W,Y,K,X,U,Q,G);this.isDepthTexture=!0,this.image={width:J,height:$},this.magFilter=K!==void 0?K:1003,this.minFilter=X!==void 0?X:1003,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.compareFunction=J.compareFunction,this}toJSON(J){let $=super.toJSON(J);if(this.compareFunction!==null)$.compareFunction=this.compareFunction;return $}}var i5=new _0,G5=new H9(1,1),a5=new Z9,r5=new l5,t5=new G9,U5=[],H5=[],V5=new Float32Array(16),q5=new Float32Array(9),E5=new Float32Array(4);function $7(J,$,Q){let Z=J[0];if(Z<=0||Z>0)return J;let W=$*Q,Y=U5[W];if(Y===void 0)Y=new Float32Array(W),U5[W]=Y;if($!==0){Z.toArray(Y,0);for(let K=1,X=0;K!==$;++K)X+=Q,J[K].toArray(Y,X)}return Y}function V0(J,$){if(J.length!==$.length)return!1;for(let Q=0,Z=J.length;Q<Z;Q++)if(J[Q]!==$[Q])return!1;return!0}function q0(J,$){for(let Q=0,Z=$.length;Q<Z;Q++)J[Q]=$[Q]}function W8(J,$){let Q=H5[$];if(Q===void 0)Q=new Int32Array($),H5[$]=Q;for(let Z=0;Z!==$;++Z)Q[Z]=J.allocateTextureUnit();return Q}function JW(J,$){let Q=this.cache;if(Q[0]===$)return;J.uniform1f(this.addr,$),Q[0]=$}function $W(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y)J.uniform2f(this.addr,$.x,$.y),Q[0]=$.x,Q[1]=$.y}else{if(V0(Q,$))return;J.uniform2fv(this.addr,$),q0(Q,$)}}function QW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z)J.uniform3f(this.addr,$.x,$.y,$.z),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z}else if($.r!==void 0){if(Q[0]!==$.r||Q[1]!==$.g||Q[2]!==$.b)J.uniform3f(this.addr,$.r,$.g,$.b),Q[0]=$.r,Q[1]=$.g,Q[2]=$.b}else{if(V0(Q,$))return;J.uniform3fv(this.addr,$),q0(Q,$)}}function ZW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z||Q[3]!==$.w)J.uniform4f(this.addr,$.x,$.y,$.z,$.w),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z,Q[3]=$.w}else{if(V0(Q,$))return;J.uniform4fv(this.addr,$),q0(Q,$)}}function WW(J,$){let Q=this.cache,Z=$.elements;if(Z===void 0){if(V0(Q,$))return;J.uniformMatrix2fv(this.addr,!1,$),q0(Q,$)}else{if(V0(Q,Z))return;E5.set(Z),J.uniformMatrix2fv(this.addr,!1,E5),q0(Q,Z)}}function YW(J,$){let Q=this.cache,Z=$.elements;if(Z===void 0){if(V0(Q,$))return;J.uniformMatrix3fv(this.addr,!1,$),q0(Q,$)}else{if(V0(Q,Z))return;q5.set(Z),J.uniformMatrix3fv(this.addr,!1,q5),q0(Q,Z)}}function KW(J,$){let Q=this.cache,Z=$.elements;if(Z===void 0){if(V0(Q,$))return;J.uniformMatrix4fv(this.addr,!1,$),q0(Q,$)}else{if(V0(Q,Z))return;V5.set(Z),J.uniformMatrix4fv(this.addr,!1,V5),q0(Q,Z)}}function XW(J,$){let Q=this.cache;if(Q[0]===$)return;J.uniform1i(this.addr,$),Q[0]=$}function GW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y)J.uniform2i(this.addr,$.x,$.y),Q[0]=$.x,Q[1]=$.y}else{if(V0(Q,$))return;J.uniform2iv(this.addr,$),q0(Q,$)}}function UW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z)J.uniform3i(this.addr,$.x,$.y,$.z),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z}else{if(V0(Q,$))return;J.uniform3iv(this.addr,$),q0(Q,$)}}function HW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z||Q[3]!==$.w)J.uniform4i(this.addr,$.x,$.y,$.z,$.w),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z,Q[3]=$.w}else{if(V0(Q,$))return;J.uniform4iv(this.addr,$),q0(Q,$)}}function VW(J,$){let Q=this.cache;if(Q[0]===$)return;J.uniform1ui(this.addr,$),Q[0]=$}function qW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y)J.uniform2ui(this.addr,$.x,$.y),Q[0]=$.x,Q[1]=$.y}else{if(V0(Q,$))return;J.uniform2uiv(this.addr,$),q0(Q,$)}}function EW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z)J.uniform3ui(this.addr,$.x,$.y,$.z),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z}else{if(V0(Q,$))return;J.uniform3uiv(this.addr,$),q0(Q,$)}}function FW(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z||Q[3]!==$.w)J.uniform4ui(this.addr,$.x,$.y,$.z,$.w),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z,Q[3]=$.w}else{if(V0(Q,$))return;J.uniform4uiv(this.addr,$),q0(Q,$)}}function DW(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;let Y;if(this.type===J.SAMPLER_2D_SHADOW)G5.compareFunction=515,Y=G5;else Y=i5;Q.setTexture2D($||Y,W)}function RW(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;Q.setTexture3D($||r5,W)}function NW(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;Q.setTextureCube($||t5,W)}function OW(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;Q.setTexture2DArray($||a5,W)}function MW(J){switch(J){case 5126:return JW;case 35664:return $W;case 35665:return QW;case 35666:return ZW;case 35674:return WW;case 35675:return YW;case 35676:return KW;case 5124:case 35670:return XW;case 35667:case 35671:return GW;case 35668:case 35672:return UW;case 35669:case 35673:return HW;case 5125:return VW;case 36294:return qW;case 36295:return EW;case 36296:return FW;case 35678:case 36198:case 36298:case 36306:case 35682:return DW;case 35679:case 36299:case 36307:return RW;case 35680:case 36300:case 36308:case 36293:return NW;case 36289:case 36303:case 36311:case 36292:return OW}}function BW(J,$){J.uniform1fv(this.addr,$)}function AW(J,$){let Q=$7($,this.size,2);J.uniform2fv(this.addr,Q)}function LW(J,$){let Q=$7($,this.size,3);J.uniform3fv(this.addr,Q)}function _W(J,$){let Q=$7($,this.size,4);J.uniform4fv(this.addr,Q)}function zW(J,$){let Q=$7($,this.size,4);J.uniformMatrix2fv(this.addr,!1,Q)}function kW(J,$){let Q=$7($,this.size,9);J.uniformMatrix3fv(this.addr,!1,Q)}function CW(J,$){let Q=$7($,this.size,16);J.uniformMatrix4fv(this.addr,!1,Q)}function wW(J,$){J.uniform1iv(this.addr,$)}function IW(J,$){J.uniform2iv(this.addr,$)}function TW(J,$){J.uniform3iv(this.addr,$)}function PW(J,$){J.uniform4iv(this.addr,$)}function SW(J,$){J.uniform1uiv(this.addr,$)}function yW(J,$){J.uniform2uiv(this.addr,$)}function vW(J,$){J.uniform3uiv(this.addr,$)}function jW(J,$){J.uniform4uiv(this.addr,$)}function fW(J,$,Q){let Z=this.cache,W=$.length,Y=W8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),q0(Z,Y);for(let K=0;K!==W;++K)Q.setTexture2D($[K]||i5,Y[K])}function hW(J,$,Q){let Z=this.cache,W=$.length,Y=W8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),q0(Z,Y);for(let K=0;K!==W;++K)Q.setTexture3D($[K]||r5,Y[K])}function bW(J,$,Q){let Z=this.cache,W=$.length,Y=W8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),q0(Z,Y);for(let K=0;K!==W;++K)Q.setTextureCube($[K]||t5,Y[K])}function xW(J,$,Q){let Z=this.cache,W=$.length,Y=W8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),q0(Z,Y);for(let K=0;K!==W;++K)Q.setTexture2DArray($[K]||a5,Y[K])}function gW(J){switch(J){case 5126:return BW;case 35664:return AW;case 35665:return LW;case 35666:return _W;case 35674:return zW;case 35675:return kW;case 35676:return CW;case 5124:case 35670:return wW;case 35667:case 35671:return IW;case 35668:case 35672:return TW;case 35669:case 35673:return PW;case 5125:return SW;case 36294:return yW;case 36295:return vW;case 36296:return jW;case 35678:case 36198:case 36298:case 36306:case 35682:return fW;case 35679:case 36299:case 36307:return hW;case 35680:case 36300:case 36308:case 36293:return bW;case 36289:case 36303:case 36311:case 36292:return xW}}class e5{constructor(J,$,Q){this.id=J,this.addr=Q,this.cache=[],this.type=$.type,this.setValue=MW($.type)}}class J${constructor(J,$,Q){this.id=J,this.addr=Q,this.cache=[],this.type=$.type,this.size=$.size,this.setValue=gW($.type)}}class $${constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,$,Q){let Z=this.seq;for(let W=0,Y=Z.length;W!==Y;++W){let K=Z[W];K.setValue(J,$[K.id],Q)}}}var n8=/(\w+)(\])?(\[|\.)?/g;function F5(J,$){J.seq.push($),J.map[$.id]=$}function pW(J,$,Q){let Z=J.name,W=Z.length;n8.lastIndex=0;while(!0){let Y=n8.exec(Z),K=n8.lastIndex,X=Y[1],G=Y[2]==="]",U=Y[3];if(G)X=X|0;if(U===void 0||U==="["&&K+2===W){F5(Q,U===void 0?new e5(X,J,$):new J$(X,J,$));break}else{let H=Q.map[X];if(H===void 0)H=new $$(X),F5(Q,H);Q=H}}}class M7{constructor(J,$){this.seq=[],this.map={};let Q=J.getProgramParameter($,J.ACTIVE_UNIFORMS);for(let Z=0;Z<Q;++Z){let W=J.getActiveUniform($,Z),Y=J.getUniformLocation($,W.name);pW(W,Y,this)}}setValue(J,$,Q,Z){let W=this.map[$];if(W!==void 0)W.setValue(J,Q,Z)}setOptional(J,$,Q){let Z=$[Q];if(Z!==void 0)this.setValue(J,Q,Z)}static upload(J,$,Q,Z){for(let W=0,Y=$.length;W!==Y;++W){let K=$[W],X=Q[K.id];if(X.needsUpdate!==!1)K.setValue(J,X.value,Z)}}static seqWithValue(J,$){let Q=[];for(let Z=0,W=J.length;Z!==W;++Z){let Y=J[Z];if(Y.id in $)Q.push(Y)}return Q}}function D5(J,$,Q){let Z=J.createShader($);return J.shaderSource(Z,Q),J.compileShader(Z),Z}var mW=37297,uW=0;function lW(J,$){let Q=J.split(`
`),Z=[],W=Math.max($-6,0),Y=Math.min($+6,Q.length);for(let K=W;K<Y;K++){let X=K+1;Z.push(`${X===$?">":" "} ${X}: ${Q[K]}`)}return Z.join(`
`)}var R5=new gJ;function dW(J){oJ._getMatrix(R5,oJ.workingColorSpace,J);let $=`mat3( ${R5.elements.map((Q)=>Q.toFixed(4))} )`;switch(oJ.getTransfer(J)){case"linear":return[$,"LinearTransferOETF"];case"srgb":return[$,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",J),[$,"LinearTransferOETF"]}}function N5(J,$,Q){let Z=J.getShaderParameter($,J.COMPILE_STATUS),W=J.getShaderInfoLog($).trim();if(Z&&W==="")return"";let Y=/ERROR: 0:(\d+)/.exec(W);if(Y){let K=parseInt(Y[1]);return Q.toUpperCase()+`

`+W+`

`+lW(J.getShaderSource($),K)}else return W}function cW(J,$){let Q=dW($);return[`vec4 ${J}( vec4 value ) {`,`	return ${Q[1]}( vec4( value.rgb * ${Q[0]}, value.a ) );`,"}"].join(`
`)}function nW(J,$){let Q;switch($){case 1:Q="Linear";break;case 2:Q="Reinhard";break;case 3:Q="Cineon";break;case 4:Q="ACESFilmic";break;case 6:Q="AgX";break;case 7:Q="Neutral";break;case 5:Q="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",$),Q="Linear"}return"vec3 "+J+"( vec3 color ) { return "+Q+"ToneMapping( color ); }"}var c7=new T;function sW(){oJ.getLuminanceCoefficients(c7);let J=c7.x.toFixed(4),$=c7.y.toFixed(4),Q=c7.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${$}, ${Q} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function oW(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(O7).join(`
`)}function iW(J){let $=[];for(let Q in J){let Z=J[Q];if(Z===!1)continue;$.push("#define "+Q+" "+Z)}return $.join(`
`)}function aW(J,$){let Q={},Z=J.getProgramParameter($,J.ACTIVE_ATTRIBUTES);for(let W=0;W<Z;W++){let Y=J.getActiveAttrib($,W),K=Y.name,X=1;if(Y.type===J.FLOAT_MAT2)X=2;if(Y.type===J.FLOAT_MAT3)X=3;if(Y.type===J.FLOAT_MAT4)X=4;Q[K]={type:Y.type,location:J.getAttribLocation($,K),locationSize:X}}return Q}function O7(J){return J!==""}function O5(J,$){let Q=$.numSpotLightShadows+$.numSpotLightMaps-$.numSpotLightShadowsWithMaps;return J.replace(/NUM_DIR_LIGHTS/g,$.numDirLights).replace(/NUM_SPOT_LIGHTS/g,$.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,$.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,Q).replace(/NUM_RECT_AREA_LIGHTS/g,$.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,$.numPointLights).replace(/NUM_HEMI_LIGHTS/g,$.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,$.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,$.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,$.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,$.numPointLightShadows)}function M5(J,$){return J.replace(/NUM_CLIPPING_PLANES/g,$.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,$.numClippingPlanes-$.numClipIntersection)}var rW=/^[ \t]*#include +<([\w\d./]+)>/gm;function J9(J){return J.replace(rW,eW)}var tW=new Map;function eW(J,$){let Q=uJ[$];if(Q===void 0){let Z=tW.get($);if(Z!==void 0)Q=uJ[Z],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',$,Z);else throw Error("Can not resolve #include <"+$+">")}return J9(Q)}var JY=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function B5(J){return J.replace(JY,$Y)}function $Y(J,$,Q,Z){let W="";for(let Y=parseInt($);Y<parseInt(Q);Y++)W+=Z.replace(/\[\s*i\s*\]/g,"[ "+Y+" ]").replace(/UNROLLED_LOOP_INDEX/g,Y);return W}function A5(J){let $=`precision ${J.precision} float;
	precision ${J.precision} int;
	precision ${J.precision} sampler2D;
	precision ${J.precision} samplerCube;
	precision ${J.precision} sampler3D;
	precision ${J.precision} sampler2DArray;
	precision ${J.precision} sampler2DShadow;
	precision ${J.precision} samplerCubeShadow;
	precision ${J.precision} sampler2DArrayShadow;
	precision ${J.precision} isampler2D;
	precision ${J.precision} isampler3D;
	precision ${J.precision} isamplerCube;
	precision ${J.precision} isampler2DArray;
	precision ${J.precision} usampler2D;
	precision ${J.precision} usampler3D;
	precision ${J.precision} usamplerCube;
	precision ${J.precision} usampler2DArray;
	`;if(J.precision==="highp")$+=`
#define HIGH_PRECISION`;else if(J.precision==="mediump")$+=`
#define MEDIUM_PRECISION`;else if(J.precision==="lowp")$+=`
#define LOW_PRECISION`;return $}function QY(J){let $="SHADOWMAP_TYPE_BASIC";if(J.shadowMapType===1)$="SHADOWMAP_TYPE_PCF";else if(J.shadowMapType===2)$="SHADOWMAP_TYPE_PCF_SOFT";else if(J.shadowMapType===3)$="SHADOWMAP_TYPE_VSM";return $}function ZY(J){let $="ENVMAP_TYPE_CUBE";if(J.envMap)switch(J.envMapMode){case 301:case 302:$="ENVMAP_TYPE_CUBE";break;case 306:$="ENVMAP_TYPE_CUBE_UV";break}return $}function WY(J){let $="ENVMAP_MODE_REFLECTION";if(J.envMap)switch(J.envMapMode){case 302:$="ENVMAP_MODE_REFRACTION";break}return $}function YY(J){let $="ENVMAP_BLENDING_NONE";if(J.envMap)switch(J.combine){case 0:$="ENVMAP_BLENDING_MULTIPLY";break;case 1:$="ENVMAP_BLENDING_MIX";break;case 2:$="ENVMAP_BLENDING_ADD";break}return $}function KY(J){let $=J.envMapCubeUVHeight;if($===null)return null;let Q=Math.log2($)-2,Z=1/$;return{texelWidth:1/(3*Math.max(Math.pow(2,Q),112)),texelHeight:Z,maxMip:Q}}function XY(J,$,Q,Z){let W=J.getContext(),Y=Q.defines,K=Q.vertexShader,X=Q.fragmentShader,G=QY(Q),U=ZY(Q),V=WY(Q),H=YY(Q),q=KY(Q),D=oW(Q),A=iW(Y),O=W.createProgram(),F,E,_=Q.glslVersion?"#version "+Q.glslVersion+`
`:"";if(Q.isRawShaderMaterial){if(F=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,A].filter(O7).join(`
`),F.length>0)F+=`
`;if(E=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,A].filter(O7).join(`
`),E.length>0)E+=`
`}else F=[A5(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,A,Q.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",Q.batching?"#define USE_BATCHING":"",Q.batchingColor?"#define USE_BATCHING_COLOR":"",Q.instancing?"#define USE_INSTANCING":"",Q.instancingColor?"#define USE_INSTANCING_COLOR":"",Q.instancingMorph?"#define USE_INSTANCING_MORPH":"",Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.map?"#define USE_MAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+V:"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.displacementMap?"#define USE_DISPLACEMENTMAP":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.mapUv?"#define MAP_UV "+Q.mapUv:"",Q.alphaMapUv?"#define ALPHAMAP_UV "+Q.alphaMapUv:"",Q.lightMapUv?"#define LIGHTMAP_UV "+Q.lightMapUv:"",Q.aoMapUv?"#define AOMAP_UV "+Q.aoMapUv:"",Q.emissiveMapUv?"#define EMISSIVEMAP_UV "+Q.emissiveMapUv:"",Q.bumpMapUv?"#define BUMPMAP_UV "+Q.bumpMapUv:"",Q.normalMapUv?"#define NORMALMAP_UV "+Q.normalMapUv:"",Q.displacementMapUv?"#define DISPLACEMENTMAP_UV "+Q.displacementMapUv:"",Q.metalnessMapUv?"#define METALNESSMAP_UV "+Q.metalnessMapUv:"",Q.roughnessMapUv?"#define ROUGHNESSMAP_UV "+Q.roughnessMapUv:"",Q.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+Q.anisotropyMapUv:"",Q.clearcoatMapUv?"#define CLEARCOATMAP_UV "+Q.clearcoatMapUv:"",Q.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+Q.clearcoatNormalMapUv:"",Q.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+Q.clearcoatRoughnessMapUv:"",Q.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+Q.iridescenceMapUv:"",Q.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+Q.iridescenceThicknessMapUv:"",Q.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+Q.sheenColorMapUv:"",Q.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+Q.sheenRoughnessMapUv:"",Q.specularMapUv?"#define SPECULARMAP_UV "+Q.specularMapUv:"",Q.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+Q.specularColorMapUv:"",Q.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+Q.specularIntensityMapUv:"",Q.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+Q.transmissionMapUv:"",Q.thicknessMapUv?"#define THICKNESSMAP_UV "+Q.thicknessMapUv:"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.flatShading?"#define FLAT_SHADED":"",Q.skinning?"#define USE_SKINNING":"",Q.morphTargets?"#define USE_MORPHTARGETS":"",Q.morphNormals&&Q.flatShading===!1?"#define USE_MORPHNORMALS":"",Q.morphColors?"#define USE_MORPHCOLORS":"",Q.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+Q.morphTextureStride:"",Q.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+Q.morphTargetsCount:"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+G:"",Q.sizeAttenuation?"#define USE_SIZEATTENUATION":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",Q.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(O7).join(`
`),E=[A5(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,A,Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",Q.map?"#define USE_MAP":"",Q.matcap?"#define USE_MATCAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+U:"",Q.envMap?"#define "+V:"",Q.envMap?"#define "+H:"",q?"#define CUBEUV_TEXEL_WIDTH "+q.texelWidth:"",q?"#define CUBEUV_TEXEL_HEIGHT "+q.texelHeight:"",q?"#define CUBEUV_MAX_MIP "+q.maxMip+".0":"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoat?"#define USE_CLEARCOAT":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.dispersion?"#define USE_DISPERSION":"",Q.iridescence?"#define USE_IRIDESCENCE":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaTest?"#define USE_ALPHATEST":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.sheen?"#define USE_SHEEN":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors||Q.instancingColor||Q.batchingColor?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.gradientMap?"#define USE_GRADIENTMAP":"",Q.flatShading?"#define FLAT_SHADED":"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+G:"",Q.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",Q.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",Q.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",Q.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",Q.toneMapping!==0?"#define TONE_MAPPING":"",Q.toneMapping!==0?uJ.tonemapping_pars_fragment:"",Q.toneMapping!==0?nW("toneMapping",Q.toneMapping):"",Q.dithering?"#define DITHERING":"",Q.opaque?"#define OPAQUE":"",uJ.colorspace_pars_fragment,cW("linearToOutputTexel",Q.outputColorSpace),sW(),Q.useDepthPacking?"#define DEPTH_PACKING "+Q.depthPacking:"",`
`].filter(O7).join(`
`);if(K=J9(K),K=O5(K,Q),K=M5(K,Q),X=J9(X),X=O5(X,Q),X=M5(X,Q),K=B5(K),X=B5(X),Q.isRawShaderMaterial!==!0)_=`#version 300 es
`,F=[D,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+F,E=["#define varying in",Q.glslVersion==="300 es"?"":"layout(location = 0) out highp vec4 pc_fragColor;",Q.glslVersion==="300 es"?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+E;let N=_+F+K,C=_+E+X,f=D5(W,W.VERTEX_SHADER,N),k=D5(W,W.FRAGMENT_SHADER,C);if(W.attachShader(O,f),W.attachShader(O,k),Q.index0AttributeName!==void 0)W.bindAttribLocation(O,0,Q.index0AttributeName);else if(Q.morphTargets===!0)W.bindAttribLocation(O,0,"position");W.linkProgram(O);function w(S){if(J.debug.checkShaderErrors){let x=W.getProgramInfoLog(O).trim(),l=W.getShaderInfoLog(f).trim(),s=W.getShaderInfoLog(k).trim(),d=!0,c=!0;if(W.getProgramParameter(O,W.LINK_STATUS)===!1)if(d=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(W,O,f,k);else{let e=N5(W,f,"vertex"),m=N5(W,k,"fragment");console.error("THREE.WebGLProgram: Shader Error "+W.getError()+" - VALIDATE_STATUS "+W.getProgramParameter(O,W.VALIDATE_STATUS)+`

Material Name: `+S.name+`
Material Type: `+S.type+`

Program Info Log: `+x+`
`+e+`
`+m)}else if(x!=="")console.warn("THREE.WebGLProgram: Program Info Log:",x);else if(l===""||s==="")c=!1;if(c)S.diagnostics={runnable:d,programLog:x,vertexShader:{log:l,prefix:F},fragmentShader:{log:s,prefix:E}}}W.deleteShader(f),W.deleteShader(k),b=new M7(W,O),B=aW(W,O)}let b;this.getUniforms=function(){if(b===void 0)w(this);return b};let B;this.getAttributes=function(){if(B===void 0)w(this);return B};let L=Q.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(L===!1)L=W.getProgramParameter(O,mW);return L},this.destroy=function(){Z.releaseStatesOfProgram(this),W.deleteProgram(O),this.program=void 0},this.type=Q.shaderType,this.name=Q.shaderName,this.id=uW++,this.cacheKey=$,this.usedTimes=1,this.program=O,this.vertexShader=f,this.fragmentShader=k,this}var GY=0;class Q${constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J){let{vertexShader:$,fragmentShader:Q}=J,Z=this._getShaderStage($),W=this._getShaderStage(Q),Y=this._getShaderCacheForMaterial(J);if(Y.has(Z)===!1)Y.add(Z),Z.usedTimes++;if(Y.has(W)===!1)Y.add(W),W.usedTimes++;return this}remove(J){let $=this.materialCache.get(J);for(let Q of $)if(Q.usedTimes--,Q.usedTimes===0)this.shaderCache.delete(Q.code);return this.materialCache.delete(J),this}getVertexShaderID(J){return this._getShaderStage(J.vertexShader).id}getFragmentShaderID(J){return this._getShaderStage(J.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let $=this.materialCache,Q=$.get(J);if(Q===void 0)Q=new Set,$.set(J,Q);return Q}_getShaderStage(J){let $=this.shaderCache,Q=$.get(J);if(Q===void 0)Q=new Z$(J),$.set(J,Q);return Q}}class Z${constructor(J){this.id=GY++,this.code=J,this.usedTimes=0}}function UY(J,$,Q,Z,W,Y,K){let X=new Q8,G=new Q$,U=new Set,V=[],H=W.logarithmicDepthBuffer,q=W.vertexTextures,D=W.precision,A={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function O(B){if(U.add(B),B===0)return"uv";return`uv${B}`}function F(B,L,S,x,l){let s=x.fog,d=l.geometry,c=B.isMeshStandardMaterial?x.environment:null,e=(B.isMeshStandardMaterial?Q:$).get(B.envMap||c),m=!!e&&e.mapping===306?e.image.height:null,YJ=A[B.type];if(B.precision!==null){if(D=W.getMaxPrecision(B.precision),D!==B.precision)console.warn("THREE.WebGLProgram.getParameters:",B.precision,"not supported, using",D,"instead.")}let GJ=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,wJ=GJ!==void 0?GJ.length:0,pJ=0;if(d.morphAttributes.position!==void 0)pJ=1;if(d.morphAttributes.normal!==void 0)pJ=2;if(d.morphAttributes.color!==void 0)pJ=3;let o,JJ,IJ,SJ;if(YJ){let aJ=l0[YJ];o=aJ.vertexShader,JJ=aJ.fragmentShader}else o=B.vertexShader,JJ=B.fragmentShader,G.update(B),IJ=G.getVertexShaderID(B),SJ=G.getFragmentShaderID(B);let I=J.getRenderTarget(),FJ=J.state.buffers.depth.getReversed(),kJ=l.isInstancedMesh===!0,BJ=l.isBatchedMesh===!0,XJ=!!B.map,yJ=!!B.matcap,P=!!e,lJ=!!B.aoMap,zJ=!!B.lightMap,vJ=!!B.bumpMap,UJ=!!B.normalMap,dJ=!!B.displacementMap,NJ=!!B.emissiveMap,WJ=!!B.metalnessMap,z=!!B.roughnessMap,R=B.anisotropy>0,h=B.clearcoat>0,i=B.dispersion>0,t=B.iridescence>0,u=B.sheen>0,TJ=B.transmission>0,HJ=R&&!!B.anisotropyMap,RJ=h&&!!B.clearcoatMap,hJ=h&&!!B.clearcoatNormalMap,QJ=h&&!!B.clearcoatRoughnessMap,DJ=t&&!!B.iridescenceMap,sJ=t&&!!B.iridescenceThicknessMap,jJ=u&&!!B.sheenColorMap,OJ=u&&!!B.sheenRoughnessMap,bJ=!!B.specularMap,cJ=!!B.specularColorMap,X0=!!B.specularIntensityMap,y=TJ&&!!B.transmissionMap,$J=TJ&&!!B.thicknessMap,a=!!B.gradientMap,r=!!B.alphaMap,EJ=B.alphaTest>0,VJ=!!B.alphaHash,mJ=!!B.extensions,G0=0;if(B.toneMapped){if(I===null||I.isXRRenderTarget===!0)G0=J.toneMapping}let D0={shaderID:YJ,shaderType:B.type,shaderName:B.name,vertexShader:o,fragmentShader:JJ,defines:B.defines,customVertexShaderID:IJ,customFragmentShaderID:SJ,isRawShaderMaterial:B.isRawShaderMaterial===!0,glslVersion:B.glslVersion,precision:D,batching:BJ,batchingColor:BJ&&l._colorsTexture!==null,instancing:kJ,instancingColor:kJ&&l.instanceColor!==null,instancingMorph:kJ&&l.morphTexture!==null,supportsVertexTextures:q,outputColorSpace:I===null?J.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:"srgb-linear",alphaToCoverage:!!B.alphaToCoverage,map:XJ,matcap:yJ,envMap:P,envMapMode:P&&e.mapping,envMapCubeUVHeight:m,aoMap:lJ,lightMap:zJ,bumpMap:vJ,normalMap:UJ,displacementMap:q&&dJ,emissiveMap:NJ,normalMapObjectSpace:UJ&&B.normalMapType===1,normalMapTangentSpace:UJ&&B.normalMapType===0,metalnessMap:WJ,roughnessMap:z,anisotropy:R,anisotropyMap:HJ,clearcoat:h,clearcoatMap:RJ,clearcoatNormalMap:hJ,clearcoatRoughnessMap:QJ,dispersion:i,iridescence:t,iridescenceMap:DJ,iridescenceThicknessMap:sJ,sheen:u,sheenColorMap:jJ,sheenRoughnessMap:OJ,specularMap:bJ,specularColorMap:cJ,specularIntensityMap:X0,transmission:TJ,transmissionMap:y,thicknessMap:$J,gradientMap:a,opaque:B.transparent===!1&&B.blending===1&&B.alphaToCoverage===!1,alphaMap:r,alphaTest:EJ,alphaHash:VJ,combine:B.combine,mapUv:XJ&&O(B.map.channel),aoMapUv:lJ&&O(B.aoMap.channel),lightMapUv:zJ&&O(B.lightMap.channel),bumpMapUv:vJ&&O(B.bumpMap.channel),normalMapUv:UJ&&O(B.normalMap.channel),displacementMapUv:dJ&&O(B.displacementMap.channel),emissiveMapUv:NJ&&O(B.emissiveMap.channel),metalnessMapUv:WJ&&O(B.metalnessMap.channel),roughnessMapUv:z&&O(B.roughnessMap.channel),anisotropyMapUv:HJ&&O(B.anisotropyMap.channel),clearcoatMapUv:RJ&&O(B.clearcoatMap.channel),clearcoatNormalMapUv:hJ&&O(B.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:QJ&&O(B.clearcoatRoughnessMap.channel),iridescenceMapUv:DJ&&O(B.iridescenceMap.channel),iridescenceThicknessMapUv:sJ&&O(B.iridescenceThicknessMap.channel),sheenColorMapUv:jJ&&O(B.sheenColorMap.channel),sheenRoughnessMapUv:OJ&&O(B.sheenRoughnessMap.channel),specularMapUv:bJ&&O(B.specularMap.channel),specularColorMapUv:cJ&&O(B.specularColorMap.channel),specularIntensityMapUv:X0&&O(B.specularIntensityMap.channel),transmissionMapUv:y&&O(B.transmissionMap.channel),thicknessMapUv:$J&&O(B.thicknessMap.channel),alphaMapUv:r&&O(B.alphaMap.channel),vertexTangents:!!d.attributes.tangent&&(UJ||R),vertexColors:B.vertexColors,vertexAlphas:B.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,pointsUvs:l.isPoints===!0&&!!d.attributes.uv&&(XJ||r),fog:!!s,useFog:B.fog===!0,fogExp2:!!s&&s.isFogExp2,flatShading:B.flatShading===!0,sizeAttenuation:B.sizeAttenuation===!0,logarithmicDepthBuffer:H,reverseDepthBuffer:FJ,skinning:l.isSkinnedMesh===!0,morphTargets:d.morphAttributes.position!==void 0,morphNormals:d.morphAttributes.normal!==void 0,morphColors:d.morphAttributes.color!==void 0,morphTargetsCount:wJ,morphTextureStride:pJ,numDirLights:L.directional.length,numPointLights:L.point.length,numSpotLights:L.spot.length,numSpotLightMaps:L.spotLightMap.length,numRectAreaLights:L.rectArea.length,numHemiLights:L.hemi.length,numDirLightShadows:L.directionalShadowMap.length,numPointLightShadows:L.pointShadowMap.length,numSpotLightShadows:L.spotShadowMap.length,numSpotLightShadowsWithMaps:L.numSpotLightShadowsWithMaps,numLightProbes:L.numLightProbes,numClippingPlanes:K.numPlanes,numClipIntersection:K.numIntersection,dithering:B.dithering,shadowMapEnabled:J.shadowMap.enabled&&S.length>0,shadowMapType:J.shadowMap.type,toneMapping:G0,decodeVideoTexture:XJ&&B.map.isVideoTexture===!0&&oJ.getTransfer(B.map.colorSpace)==="srgb",decodeVideoTextureEmissive:NJ&&B.emissiveMap.isVideoTexture===!0&&oJ.getTransfer(B.emissiveMap.colorSpace)==="srgb",premultipliedAlpha:B.premultipliedAlpha,doubleSided:B.side===2,flipSided:B.side===1,useDepthPacking:B.depthPacking>=0,depthPacking:B.depthPacking||0,index0AttributeName:B.index0AttributeName,extensionClipCullDistance:mJ&&B.extensions.clipCullDistance===!0&&Z.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(mJ&&B.extensions.multiDraw===!0||BJ)&&Z.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:Z.has("KHR_parallel_shader_compile"),customProgramCacheKey:B.customProgramCacheKey()};return D0.vertexUv1s=U.has(1),D0.vertexUv2s=U.has(2),D0.vertexUv3s=U.has(3),U.clear(),D0}function E(B){let L=[];if(B.shaderID)L.push(B.shaderID);else L.push(B.customVertexShaderID),L.push(B.customFragmentShaderID);if(B.defines!==void 0)for(let S in B.defines)L.push(S),L.push(B.defines[S]);if(B.isRawShaderMaterial===!1)_(L,B),N(L,B),L.push(J.outputColorSpace);return L.push(B.customProgramCacheKey),L.join()}function _(B,L){B.push(L.precision),B.push(L.outputColorSpace),B.push(L.envMapMode),B.push(L.envMapCubeUVHeight),B.push(L.mapUv),B.push(L.alphaMapUv),B.push(L.lightMapUv),B.push(L.aoMapUv),B.push(L.bumpMapUv),B.push(L.normalMapUv),B.push(L.displacementMapUv),B.push(L.emissiveMapUv),B.push(L.metalnessMapUv),B.push(L.roughnessMapUv),B.push(L.anisotropyMapUv),B.push(L.clearcoatMapUv),B.push(L.clearcoatNormalMapUv),B.push(L.clearcoatRoughnessMapUv),B.push(L.iridescenceMapUv),B.push(L.iridescenceThicknessMapUv),B.push(L.sheenColorMapUv),B.push(L.sheenRoughnessMapUv),B.push(L.specularMapUv),B.push(L.specularColorMapUv),B.push(L.specularIntensityMapUv),B.push(L.transmissionMapUv),B.push(L.thicknessMapUv),B.push(L.combine),B.push(L.fogExp2),B.push(L.sizeAttenuation),B.push(L.morphTargetsCount),B.push(L.morphAttributeCount),B.push(L.numDirLights),B.push(L.numPointLights),B.push(L.numSpotLights),B.push(L.numSpotLightMaps),B.push(L.numHemiLights),B.push(L.numRectAreaLights),B.push(L.numDirLightShadows),B.push(L.numPointLightShadows),B.push(L.numSpotLightShadows),B.push(L.numSpotLightShadowsWithMaps),B.push(L.numLightProbes),B.push(L.shadowMapType),B.push(L.toneMapping),B.push(L.numClippingPlanes),B.push(L.numClipIntersection),B.push(L.depthPacking)}function N(B,L){if(X.disableAll(),L.supportsVertexTextures)X.enable(0);if(L.instancing)X.enable(1);if(L.instancingColor)X.enable(2);if(L.instancingMorph)X.enable(3);if(L.matcap)X.enable(4);if(L.envMap)X.enable(5);if(L.normalMapObjectSpace)X.enable(6);if(L.normalMapTangentSpace)X.enable(7);if(L.clearcoat)X.enable(8);if(L.iridescence)X.enable(9);if(L.alphaTest)X.enable(10);if(L.vertexColors)X.enable(11);if(L.vertexAlphas)X.enable(12);if(L.vertexUv1s)X.enable(13);if(L.vertexUv2s)X.enable(14);if(L.vertexUv3s)X.enable(15);if(L.vertexTangents)X.enable(16);if(L.anisotropy)X.enable(17);if(L.alphaHash)X.enable(18);if(L.batching)X.enable(19);if(L.dispersion)X.enable(20);if(L.batchingColor)X.enable(21);if(B.push(X.mask),X.disableAll(),L.fog)X.enable(0);if(L.useFog)X.enable(1);if(L.flatShading)X.enable(2);if(L.logarithmicDepthBuffer)X.enable(3);if(L.reverseDepthBuffer)X.enable(4);if(L.skinning)X.enable(5);if(L.morphTargets)X.enable(6);if(L.morphNormals)X.enable(7);if(L.morphColors)X.enable(8);if(L.premultipliedAlpha)X.enable(9);if(L.shadowMapEnabled)X.enable(10);if(L.doubleSided)X.enable(11);if(L.flipSided)X.enable(12);if(L.useDepthPacking)X.enable(13);if(L.dithering)X.enable(14);if(L.transmission)X.enable(15);if(L.sheen)X.enable(16);if(L.opaque)X.enable(17);if(L.pointsUvs)X.enable(18);if(L.decodeVideoTexture)X.enable(19);if(L.decodeVideoTextureEmissive)X.enable(20);if(L.alphaToCoverage)X.enable(21);B.push(X.mask)}function C(B){let L=A[B.type],S;if(L){let x=l0[L];S=e$.clone(x.uniforms)}else S=B.uniforms;return S}function f(B,L){let S;for(let x=0,l=V.length;x<l;x++){let s=V[x];if(s.cacheKey===L){S=s,++S.usedTimes;break}}if(S===void 0)S=new XY(J,L,B,Y),V.push(S);return S}function k(B){if(--B.usedTimes===0){let L=V.indexOf(B);V[L]=V[V.length-1],V.pop(),B.destroy()}}function w(B){G.remove(B)}function b(){G.dispose()}return{getParameters:F,getProgramCacheKey:E,getUniforms:C,acquireProgram:f,releaseProgram:k,releaseShaderCache:w,programs:V,dispose:b}}function HY(){let J=new WeakMap;function $(K){return J.has(K)}function Q(K){let X=J.get(K);if(X===void 0)X={},J.set(K,X);return X}function Z(K){J.delete(K)}function W(K,X,G){J.get(K)[X]=G}function Y(){J=new WeakMap}return{has:$,get:Q,remove:Z,update:W,dispose:Y}}function VY(J,$){if(J.groupOrder!==$.groupOrder)return J.groupOrder-$.groupOrder;else if(J.renderOrder!==$.renderOrder)return J.renderOrder-$.renderOrder;else if(J.material.id!==$.material.id)return J.material.id-$.material.id;else if(J.z!==$.z)return J.z-$.z;else return J.id-$.id}function L5(J,$){if(J.groupOrder!==$.groupOrder)return J.groupOrder-$.groupOrder;else if(J.renderOrder!==$.renderOrder)return J.renderOrder-$.renderOrder;else if(J.z!==$.z)return $.z-J.z;else return J.id-$.id}function _5(){let J=[],$=0,Q=[],Z=[],W=[];function Y(){$=0,Q.length=0,Z.length=0,W.length=0}function K(H,q,D,A,O,F){let E=J[$];if(E===void 0)E={id:H.id,object:H,geometry:q,material:D,groupOrder:A,renderOrder:H.renderOrder,z:O,group:F},J[$]=E;else E.id=H.id,E.object=H,E.geometry=q,E.material=D,E.groupOrder=A,E.renderOrder=H.renderOrder,E.z=O,E.group=F;return $++,E}function X(H,q,D,A,O,F){let E=K(H,q,D,A,O,F);if(D.transmission>0)Z.push(E);else if(D.transparent===!0)W.push(E);else Q.push(E)}function G(H,q,D,A,O,F){let E=K(H,q,D,A,O,F);if(D.transmission>0)Z.unshift(E);else if(D.transparent===!0)W.unshift(E);else Q.unshift(E)}function U(H,q){if(Q.length>1)Q.sort(H||VY);if(Z.length>1)Z.sort(q||L5);if(W.length>1)W.sort(q||L5)}function V(){for(let H=$,q=J.length;H<q;H++){let D=J[H];if(D.id===null)break;D.id=null,D.object=null,D.geometry=null,D.material=null,D.group=null}}return{opaque:Q,transmissive:Z,transparent:W,init:Y,push:X,unshift:G,finish:V,sort:U}}function qY(){let J=new WeakMap;function $(Z,W){let Y=J.get(Z),K;if(Y===void 0)K=new _5,J.set(Z,[K]);else if(W>=Y.length)K=new _5,Y.push(K);else K=Y[W];return K}function Q(){J=new WeakMap}return{get:$,dispose:Q}}function EY(){let J={};return{get:function($){if(J[$.id]!==void 0)return J[$.id];let Q;switch($.type){case"DirectionalLight":Q={direction:new T,color:new nJ};break;case"SpotLight":Q={position:new T,direction:new T,color:new nJ,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":Q={position:new T,color:new nJ,distance:0,decay:0};break;case"HemisphereLight":Q={direction:new T,skyColor:new nJ,groundColor:new nJ};break;case"RectAreaLight":Q={color:new nJ,position:new T,halfWidth:new T,halfHeight:new T};break}return J[$.id]=Q,Q}}}function FY(){let J={};return{get:function($){if(J[$.id]!==void 0)return J[$.id];let Q;switch($.type){case"DirectionalLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new MJ};break;case"SpotLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new MJ};break;case"PointLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new MJ,shadowCameraNear:1,shadowCameraFar:1000};break}return J[$.id]=Q,Q}}}var DY=0;function RY(J,$){return($.castShadow?2:0)-(J.castShadow?2:0)+($.map?1:0)-(J.map?1:0)}function NY(J){let $=new EY,Q=FY(),Z={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)Z.probe.push(new T);let W=new T,Y=new K0,K=new K0;function X(U){let V=0,H=0,q=0;for(let B=0;B<9;B++)Z.probe[B].set(0,0,0);let D=0,A=0,O=0,F=0,E=0,_=0,N=0,C=0,f=0,k=0,w=0;U.sort(RY);for(let B=0,L=U.length;B<L;B++){let S=U[B],x=S.color,l=S.intensity,s=S.distance,d=S.shadow&&S.shadow.map?S.shadow.map.texture:null;if(S.isAmbientLight)V+=x.r*l,H+=x.g*l,q+=x.b*l;else if(S.isLightProbe){for(let c=0;c<9;c++)Z.probe[c].addScaledVector(S.sh.coefficients[c],l);w++}else if(S.isDirectionalLight){let c=$.get(S);if(c.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,m=Q.get(S);m.shadowIntensity=e.intensity,m.shadowBias=e.bias,m.shadowNormalBias=e.normalBias,m.shadowRadius=e.radius,m.shadowMapSize=e.mapSize,Z.directionalShadow[D]=m,Z.directionalShadowMap[D]=d,Z.directionalShadowMatrix[D]=S.shadow.matrix,_++}Z.directional[D]=c,D++}else if(S.isSpotLight){let c=$.get(S);c.position.setFromMatrixPosition(S.matrixWorld),c.color.copy(x).multiplyScalar(l),c.distance=s,c.coneCos=Math.cos(S.angle),c.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),c.decay=S.decay,Z.spot[O]=c;let e=S.shadow;if(S.map){if(Z.spotLightMap[f]=S.map,f++,e.updateMatrices(S),S.castShadow)k++}if(Z.spotLightMatrix[O]=e.matrix,S.castShadow){let m=Q.get(S);m.shadowIntensity=e.intensity,m.shadowBias=e.bias,m.shadowNormalBias=e.normalBias,m.shadowRadius=e.radius,m.shadowMapSize=e.mapSize,Z.spotShadow[O]=m,Z.spotShadowMap[O]=d,C++}O++}else if(S.isRectAreaLight){let c=$.get(S);c.color.copy(x).multiplyScalar(l),c.halfWidth.set(S.width*0.5,0,0),c.halfHeight.set(0,S.height*0.5,0),Z.rectArea[F]=c,F++}else if(S.isPointLight){let c=$.get(S);if(c.color.copy(S.color).multiplyScalar(S.intensity),c.distance=S.distance,c.decay=S.decay,S.castShadow){let e=S.shadow,m=Q.get(S);m.shadowIntensity=e.intensity,m.shadowBias=e.bias,m.shadowNormalBias=e.normalBias,m.shadowRadius=e.radius,m.shadowMapSize=e.mapSize,m.shadowCameraNear=e.camera.near,m.shadowCameraFar=e.camera.far,Z.pointShadow[A]=m,Z.pointShadowMap[A]=d,Z.pointShadowMatrix[A]=S.shadow.matrix,N++}Z.point[A]=c,A++}else if(S.isHemisphereLight){let c=$.get(S);c.skyColor.copy(S.color).multiplyScalar(l),c.groundColor.copy(S.groundColor).multiplyScalar(l),Z.hemi[E]=c,E++}}if(F>0)if(J.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=KJ.LTC_FLOAT_1,Z.rectAreaLTC2=KJ.LTC_FLOAT_2;else Z.rectAreaLTC1=KJ.LTC_HALF_1,Z.rectAreaLTC2=KJ.LTC_HALF_2;Z.ambient[0]=V,Z.ambient[1]=H,Z.ambient[2]=q;let b=Z.hash;if(b.directionalLength!==D||b.pointLength!==A||b.spotLength!==O||b.rectAreaLength!==F||b.hemiLength!==E||b.numDirectionalShadows!==_||b.numPointShadows!==N||b.numSpotShadows!==C||b.numSpotMaps!==f||b.numLightProbes!==w)Z.directional.length=D,Z.spot.length=O,Z.rectArea.length=F,Z.point.length=A,Z.hemi.length=E,Z.directionalShadow.length=_,Z.directionalShadowMap.length=_,Z.pointShadow.length=N,Z.pointShadowMap.length=N,Z.spotShadow.length=C,Z.spotShadowMap.length=C,Z.directionalShadowMatrix.length=_,Z.pointShadowMatrix.length=N,Z.spotLightMatrix.length=C+f-k,Z.spotLightMap.length=f,Z.numSpotLightShadowsWithMaps=k,Z.numLightProbes=w,b.directionalLength=D,b.pointLength=A,b.spotLength=O,b.rectAreaLength=F,b.hemiLength=E,b.numDirectionalShadows=_,b.numPointShadows=N,b.numSpotShadows=C,b.numSpotMaps=f,b.numLightProbes=w,Z.version=DY++}function G(U,V){let H=0,q=0,D=0,A=0,O=0,F=V.matrixWorldInverse;for(let E=0,_=U.length;E<_;E++){let N=U[E];if(N.isDirectionalLight){let C=Z.directional[H];C.direction.setFromMatrixPosition(N.matrixWorld),W.setFromMatrixPosition(N.target.matrixWorld),C.direction.sub(W),C.direction.transformDirection(F),H++}else if(N.isSpotLight){let C=Z.spot[D];C.position.setFromMatrixPosition(N.matrixWorld),C.position.applyMatrix4(F),C.direction.setFromMatrixPosition(N.matrixWorld),W.setFromMatrixPosition(N.target.matrixWorld),C.direction.sub(W),C.direction.transformDirection(F),D++}else if(N.isRectAreaLight){let C=Z.rectArea[A];C.position.setFromMatrixPosition(N.matrixWorld),C.position.applyMatrix4(F),K.identity(),Y.copy(N.matrixWorld),Y.premultiply(F),K.extractRotation(Y),C.halfWidth.set(N.width*0.5,0,0),C.halfHeight.set(0,N.height*0.5,0),C.halfWidth.applyMatrix4(K),C.halfHeight.applyMatrix4(K),A++}else if(N.isPointLight){let C=Z.point[q];C.position.setFromMatrixPosition(N.matrixWorld),C.position.applyMatrix4(F),q++}else if(N.isHemisphereLight){let C=Z.hemi[O];C.direction.setFromMatrixPosition(N.matrixWorld),C.direction.transformDirection(F),O++}}}return{setup:X,setupView:G,state:Z}}function z5(J){let $=new NY(J),Q=[],Z=[];function W(V){U.camera=V,Q.length=0,Z.length=0}function Y(V){Q.push(V)}function K(V){Z.push(V)}function X(){$.setup(Q)}function G(V){$.setupView(Q,V)}let U={lightsArray:Q,shadowsArray:Z,camera:null,lights:$,transmissionRenderTarget:{}};return{init:W,state:U,setupLights:X,setupLightsView:G,pushLight:Y,pushShadow:K}}function OY(J){let $=new WeakMap;function Q(W,Y=0){let K=$.get(W),X;if(K===void 0)X=new z5(J),$.set(W,[X]);else if(Y>=K.length)X=new z5(J),K.push(X);else X=K[Y];return X}function Z(){$=new WeakMap}return{get:Q,dispose:Z}}class W$ extends y6{static get type(){return"MeshDepthMaterial"}constructor(J){super();this.isMeshDepthMaterial=!0,this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class Y$ extends y6{static get type(){return"MeshDistanceMaterial"}constructor(J){super();this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}var MY=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,BY=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function AY(J,$,Q){let Z=new Z8,W=new MJ,Y=new MJ,K=new U0,X=new W$({depthPacking:3201}),G=new Y$,U={},V=Q.maxTextureSize,H={[0]:1,[1]:0,[2]:2},q=new Q6({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new MJ},radius:{value:4}},vertexShader:MY,fragmentShader:BY}),D=q.clone();D.defines.HORIZONTAL_PASS=1;let A=new z0;A.setAttribute("position",new j0(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let O=new PJ(A,q),F=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let E=this.type;this.render=function(k,w,b){if(F.enabled===!1)return;if(F.autoUpdate===!1&&F.needsUpdate===!1)return;if(k.length===0)return;let B=J.getRenderTarget(),L=J.getActiveCubeFace(),S=J.getActiveMipmapLevel(),x=J.state;x.setBlending(0),x.buffers.color.setClear(1,1,1,1),x.buffers.depth.setTest(!0),x.setScissorTest(!1);let l=E!==3&&this.type===3,s=E===3&&this.type!==3;for(let d=0,c=k.length;d<c;d++){let e=k[d],m=e.shadow;if(m===void 0){console.warn("THREE.WebGLShadowMap:",e,"has no shadow.");continue}if(m.autoUpdate===!1&&m.needsUpdate===!1)continue;W.copy(m.mapSize);let YJ=m.getFrameExtents();if(W.multiply(YJ),Y.copy(m.mapSize),W.x>V||W.y>V){if(W.x>V)Y.x=Math.floor(V/YJ.x),W.x=Y.x*YJ.x,m.mapSize.x=Y.x;if(W.y>V)Y.y=Math.floor(V/YJ.y),W.y=Y.y*YJ.y,m.mapSize.y=Y.y}if(m.map===null||l===!0||s===!0){let wJ=this.type!==3?{minFilter:1003,magFilter:1003}:{};if(m.map!==null)m.map.dispose();m.map=new N6(W.x,W.y,wJ),m.map.texture.name=e.name+".shadowMap",m.camera.updateProjectionMatrix()}J.setRenderTarget(m.map),J.clear();let GJ=m.getViewportCount();for(let wJ=0;wJ<GJ;wJ++){let pJ=m.getViewport(wJ);K.set(Y.x*pJ.x,Y.y*pJ.y,Y.x*pJ.z,Y.y*pJ.w),x.viewport(K),m.updateMatrices(e,wJ),Z=m.getFrustum(),C(w,b,m.camera,e,this.type)}if(m.isPointLightShadow!==!0&&this.type===3)_(m,b);m.needsUpdate=!1}E=this.type,F.needsUpdate=!1,J.setRenderTarget(B,L,S)};function _(k,w){let b=$.update(O);if(q.defines.VSM_SAMPLES!==k.blurSamples)q.defines.VSM_SAMPLES=k.blurSamples,D.defines.VSM_SAMPLES=k.blurSamples,q.needsUpdate=!0,D.needsUpdate=!0;if(k.mapPass===null)k.mapPass=new N6(W.x,W.y);q.uniforms.shadow_pass.value=k.map.texture,q.uniforms.resolution.value=k.mapSize,q.uniforms.radius.value=k.radius,J.setRenderTarget(k.mapPass),J.clear(),J.renderBufferDirect(w,null,b,q,O,null),D.uniforms.shadow_pass.value=k.mapPass.texture,D.uniforms.resolution.value=k.mapSize,D.uniforms.radius.value=k.radius,J.setRenderTarget(k.map),J.clear(),J.renderBufferDirect(w,null,b,D,O,null)}function N(k,w,b,B){let L=null,S=b.isPointLight===!0?k.customDistanceMaterial:k.customDepthMaterial;if(S!==void 0)L=S;else if(L=b.isPointLight===!0?G:X,J.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0){let x=L.uuid,l=w.uuid,s=U[x];if(s===void 0)s={},U[x]=s;let d=s[l];if(d===void 0)d=L.clone(),s[l]=d,w.addEventListener("dispose",f);L=d}if(L.visible=w.visible,L.wireframe=w.wireframe,B===3)L.side=w.shadowSide!==null?w.shadowSide:w.side;else L.side=w.shadowSide!==null?w.shadowSide:H[w.side];if(L.alphaMap=w.alphaMap,L.alphaTest=w.alphaTest,L.map=w.map,L.clipShadows=w.clipShadows,L.clippingPlanes=w.clippingPlanes,L.clipIntersection=w.clipIntersection,L.displacementMap=w.displacementMap,L.displacementScale=w.displacementScale,L.displacementBias=w.displacementBias,L.wireframeLinewidth=w.wireframeLinewidth,L.linewidth=w.linewidth,b.isPointLight===!0&&L.isMeshDistanceMaterial===!0){let x=J.properties.get(L);x.light=b}return L}function C(k,w,b,B,L){if(k.visible===!1)return;if(k.layers.test(w.layers)&&(k.isMesh||k.isLine||k.isPoints)){if((k.castShadow||k.receiveShadow&&L===3)&&(!k.frustumCulled||Z.intersectsObject(k))){k.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,k.matrixWorld);let l=$.update(k),s=k.material;if(Array.isArray(s)){let d=l.groups;for(let c=0,e=d.length;c<e;c++){let m=d[c],YJ=s[m.materialIndex];if(YJ&&YJ.visible){let GJ=N(k,YJ,B,L);k.onBeforeShadow(J,k,w,b,l,GJ,m),J.renderBufferDirect(b,null,l,GJ,k,m),k.onAfterShadow(J,k,w,b,l,GJ,m)}}}else if(s.visible){let d=N(k,s,B,L);k.onBeforeShadow(J,k,w,b,l,d,null),J.renderBufferDirect(b,null,l,d,k,null),k.onAfterShadow(J,k,w,b,l,d,null)}}}let x=k.children;for(let l=0,s=x.length;l<s;l++)C(x[l],w,b,B,L)}function f(k){k.target.removeEventListener("dispose",f);for(let b in U){let B=U[b],L=k.target.uuid;if(L in B)B[L].dispose(),delete B[L]}}}var LY={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};function _Y(J,$){function Q(){let y=!1,$J=new U0,a=null,r=new U0(0,0,0,0);return{setMask:function(EJ){if(a!==EJ&&!y)J.colorMask(EJ,EJ,EJ,EJ),a=EJ},setLocked:function(EJ){y=EJ},setClear:function(EJ,VJ,mJ,G0,D0){if(D0===!0)EJ*=G0,VJ*=G0,mJ*=G0;if($J.set(EJ,VJ,mJ,G0),r.equals($J)===!1)J.clearColor(EJ,VJ,mJ,G0),r.copy($J)},reset:function(){y=!1,a=null,r.set(-1,0,0,0)}}}function Z(){let y=!1,$J=!1,a=null,r=null,EJ=null;return{setReversed:function(VJ){if($J!==VJ){let mJ=$.get("EXT_clip_control");if($J)mJ.clipControlEXT(mJ.LOWER_LEFT_EXT,mJ.ZERO_TO_ONE_EXT);else mJ.clipControlEXT(mJ.LOWER_LEFT_EXT,mJ.NEGATIVE_ONE_TO_ONE_EXT);let G0=EJ;EJ=null,this.setClear(G0)}$J=VJ},getReversed:function(){return $J},setTest:function(VJ){if(VJ)I(J.DEPTH_TEST);else FJ(J.DEPTH_TEST)},setMask:function(VJ){if(a!==VJ&&!y)J.depthMask(VJ),a=VJ},setFunc:function(VJ){if($J)VJ=LY[VJ];if(r!==VJ){switch(VJ){case 0:J.depthFunc(J.NEVER);break;case 1:J.depthFunc(J.ALWAYS);break;case 2:J.depthFunc(J.LESS);break;case 3:J.depthFunc(J.LEQUAL);break;case 4:J.depthFunc(J.EQUAL);break;case 5:J.depthFunc(J.GEQUAL);break;case 6:J.depthFunc(J.GREATER);break;case 7:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}r=VJ}},setLocked:function(VJ){y=VJ},setClear:function(VJ){if(EJ!==VJ){if($J)VJ=1-VJ;J.clearDepth(VJ),EJ=VJ}},reset:function(){y=!1,a=null,r=null,EJ=null,$J=!1}}}function W(){let y=!1,$J=null,a=null,r=null,EJ=null,VJ=null,mJ=null,G0=null,D0=null;return{setTest:function(aJ){if(!y)if(aJ)I(J.STENCIL_TEST);else FJ(J.STENCIL_TEST)},setMask:function(aJ){if($J!==aJ&&!y)J.stencilMask(aJ),$J=aJ},setFunc:function(aJ,o0,m0){if(a!==aJ||r!==o0||EJ!==m0)J.stencilFunc(aJ,o0,m0),a=aJ,r=o0,EJ=m0},setOp:function(aJ,o0,m0){if(VJ!==aJ||mJ!==o0||G0!==m0)J.stencilOp(aJ,o0,m0),VJ=aJ,mJ=o0,G0=m0},setLocked:function(aJ){y=aJ},setClear:function(aJ){if(D0!==aJ)J.clearStencil(aJ),D0=aJ},reset:function(){y=!1,$J=null,a=null,r=null,EJ=null,VJ=null,mJ=null,G0=null,D0=null}}}let Y=new Q,K=new Z,X=new W,G=new WeakMap,U=new WeakMap,V={},H={},q=new WeakMap,D=[],A=null,O=!1,F=null,E=null,_=null,N=null,C=null,f=null,k=null,w=new nJ(0,0,0),b=0,B=!1,L=null,S=null,x=null,l=null,s=null,d=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),c=!1,e=0,m=J.getParameter(J.VERSION);if(m.indexOf("WebGL")!==-1)e=parseFloat(/^WebGL (\d)/.exec(m)[1]),c=e>=1;else if(m.indexOf("OpenGL ES")!==-1)e=parseFloat(/^OpenGL ES (\d)/.exec(m)[1]),c=e>=2;let YJ=null,GJ={},wJ=J.getParameter(J.SCISSOR_BOX),pJ=J.getParameter(J.VIEWPORT),o=new U0().fromArray(wJ),JJ=new U0().fromArray(pJ);function IJ(y,$J,a,r){let EJ=new Uint8Array(4),VJ=J.createTexture();J.bindTexture(y,VJ),J.texParameteri(y,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(y,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let mJ=0;mJ<a;mJ++)if(y===J.TEXTURE_3D||y===J.TEXTURE_2D_ARRAY)J.texImage3D($J,0,J.RGBA,1,1,r,0,J.RGBA,J.UNSIGNED_BYTE,EJ);else J.texImage2D($J+mJ,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,EJ);return VJ}let SJ={};SJ[J.TEXTURE_2D]=IJ(J.TEXTURE_2D,J.TEXTURE_2D,1),SJ[J.TEXTURE_CUBE_MAP]=IJ(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),SJ[J.TEXTURE_2D_ARRAY]=IJ(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),SJ[J.TEXTURE_3D]=IJ(J.TEXTURE_3D,J.TEXTURE_3D,1,1),Y.setClear(0,0,0,1),K.setClear(1),X.setClear(0),I(J.DEPTH_TEST),K.setFunc(3),vJ(!1),UJ(1),I(J.CULL_FACE),lJ(0);function I(y){if(V[y]!==!0)J.enable(y),V[y]=!0}function FJ(y){if(V[y]!==!1)J.disable(y),V[y]=!1}function kJ(y,$J){if(H[y]!==$J){if(J.bindFramebuffer(y,$J),H[y]=$J,y===J.DRAW_FRAMEBUFFER)H[J.FRAMEBUFFER]=$J;if(y===J.FRAMEBUFFER)H[J.DRAW_FRAMEBUFFER]=$J;return!0}return!1}function BJ(y,$J){let a=D,r=!1;if(y){if(a=q.get($J),a===void 0)a=[],q.set($J,a);let EJ=y.textures;if(a.length!==EJ.length||a[0]!==J.COLOR_ATTACHMENT0){for(let VJ=0,mJ=EJ.length;VJ<mJ;VJ++)a[VJ]=J.COLOR_ATTACHMENT0+VJ;a.length=EJ.length,r=!0}}else if(a[0]!==J.BACK)a[0]=J.BACK,r=!0;if(r)J.drawBuffers(a)}function XJ(y){if(A!==y)return J.useProgram(y),A=y,!0;return!1}let yJ={[100]:J.FUNC_ADD,[101]:J.FUNC_SUBTRACT,[102]:J.FUNC_REVERSE_SUBTRACT};yJ[103]=J.MIN,yJ[104]=J.MAX;let P={[200]:J.ZERO,[201]:J.ONE,[202]:J.SRC_COLOR,[204]:J.SRC_ALPHA,[210]:J.SRC_ALPHA_SATURATE,[208]:J.DST_COLOR,[206]:J.DST_ALPHA,[203]:J.ONE_MINUS_SRC_COLOR,[205]:J.ONE_MINUS_SRC_ALPHA,[209]:J.ONE_MINUS_DST_COLOR,[207]:J.ONE_MINUS_DST_ALPHA,[211]:J.CONSTANT_COLOR,[212]:J.ONE_MINUS_CONSTANT_COLOR,[213]:J.CONSTANT_ALPHA,[214]:J.ONE_MINUS_CONSTANT_ALPHA};function lJ(y,$J,a,r,EJ,VJ,mJ,G0,D0,aJ){if(y===0){if(O===!0)FJ(J.BLEND),O=!1;return}if(O===!1)I(J.BLEND),O=!0;if(y!==5){if(y!==F||aJ!==B){if(E!==100||C!==100)J.blendEquation(J.FUNC_ADD),E=100,C=100;if(aJ)switch(y){case 1:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case 2:J.blendFunc(J.ONE,J.ONE);break;case 3:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case 4:J.blendFuncSeparate(J.ZERO,J.SRC_COLOR,J.ZERO,J.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",y);break}else switch(y){case 1:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case 2:J.blendFunc(J.SRC_ALPHA,J.ONE);break;case 3:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case 4:J.blendFunc(J.ZERO,J.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",y);break}_=null,N=null,f=null,k=null,w.set(0,0,0),b=0,F=y,B=aJ}return}if(EJ=EJ||$J,VJ=VJ||a,mJ=mJ||r,$J!==E||EJ!==C)J.blendEquationSeparate(yJ[$J],yJ[EJ]),E=$J,C=EJ;if(a!==_||r!==N||VJ!==f||mJ!==k)J.blendFuncSeparate(P[a],P[r],P[VJ],P[mJ]),_=a,N=r,f=VJ,k=mJ;if(G0.equals(w)===!1||D0!==b)J.blendColor(G0.r,G0.g,G0.b,D0),w.copy(G0),b=D0;F=y,B=!1}function zJ(y,$J){y.side===2?FJ(J.CULL_FACE):I(J.CULL_FACE);let a=y.side===1;if($J)a=!a;vJ(a),y.blending===1&&y.transparent===!1?lJ(0):lJ(y.blending,y.blendEquation,y.blendSrc,y.blendDst,y.blendEquationAlpha,y.blendSrcAlpha,y.blendDstAlpha,y.blendColor,y.blendAlpha,y.premultipliedAlpha),K.setFunc(y.depthFunc),K.setTest(y.depthTest),K.setMask(y.depthWrite),Y.setMask(y.colorWrite);let r=y.stencilWrite;if(X.setTest(r),r)X.setMask(y.stencilWriteMask),X.setFunc(y.stencilFunc,y.stencilRef,y.stencilFuncMask),X.setOp(y.stencilFail,y.stencilZFail,y.stencilZPass);NJ(y.polygonOffset,y.polygonOffsetFactor,y.polygonOffsetUnits),y.alphaToCoverage===!0?I(J.SAMPLE_ALPHA_TO_COVERAGE):FJ(J.SAMPLE_ALPHA_TO_COVERAGE)}function vJ(y){if(L!==y){if(y)J.frontFace(J.CW);else J.frontFace(J.CCW);L=y}}function UJ(y){if(y!==0){if(I(J.CULL_FACE),y!==S)if(y===1)J.cullFace(J.BACK);else if(y===2)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else FJ(J.CULL_FACE);S=y}function dJ(y){if(y!==x){if(c)J.lineWidth(y);x=y}}function NJ(y,$J,a){if(y){if(I(J.POLYGON_OFFSET_FILL),l!==$J||s!==a)J.polygonOffset($J,a),l=$J,s=a}else FJ(J.POLYGON_OFFSET_FILL)}function WJ(y){if(y)I(J.SCISSOR_TEST);else FJ(J.SCISSOR_TEST)}function z(y){if(y===void 0)y=J.TEXTURE0+d-1;if(YJ!==y)J.activeTexture(y),YJ=y}function R(y,$J,a){if(a===void 0)if(YJ===null)a=J.TEXTURE0+d-1;else a=YJ;let r=GJ[a];if(r===void 0)r={type:void 0,texture:void 0},GJ[a]=r;if(r.type!==y||r.texture!==$J){if(YJ!==a)J.activeTexture(a),YJ=a;J.bindTexture(y,$J||SJ[y]),r.type=y,r.texture=$J}}function h(){let y=GJ[YJ];if(y!==void 0&&y.type!==void 0)J.bindTexture(y.type,null),y.type=void 0,y.texture=void 0}function i(){try{J.compressedTexImage2D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function t(){try{J.compressedTexImage3D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function u(){try{J.texSubImage2D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function TJ(){try{J.texSubImage3D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function HJ(){try{J.compressedTexSubImage2D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function RJ(){try{J.compressedTexSubImage3D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function hJ(){try{J.texStorage2D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function QJ(){try{J.texStorage3D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function DJ(){try{J.texImage2D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function sJ(){try{J.texImage3D.apply(J,arguments)}catch(y){console.error("THREE.WebGLState:",y)}}function jJ(y){if(o.equals(y)===!1)J.scissor(y.x,y.y,y.z,y.w),o.copy(y)}function OJ(y){if(JJ.equals(y)===!1)J.viewport(y.x,y.y,y.z,y.w),JJ.copy(y)}function bJ(y,$J){let a=U.get($J);if(a===void 0)a=new WeakMap,U.set($J,a);let r=a.get(y);if(r===void 0)r=J.getUniformBlockIndex($J,y.name),a.set(y,r)}function cJ(y,$J){let r=U.get($J).get(y);if(G.get($J)!==r)J.uniformBlockBinding($J,r,y.__bindingPointIndex),G.set($J,r)}function X0(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),K.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),V={},YJ=null,GJ={},H={},q=new WeakMap,D=[],A=null,O=!1,F=null,E=null,_=null,N=null,C=null,f=null,k=null,w=new nJ(0,0,0),b=0,B=!1,L=null,S=null,x=null,l=null,s=null,o.set(0,0,J.canvas.width,J.canvas.height),JJ.set(0,0,J.canvas.width,J.canvas.height),Y.reset(),K.reset(),X.reset()}return{buffers:{color:Y,depth:K,stencil:X},enable:I,disable:FJ,bindFramebuffer:kJ,drawBuffers:BJ,useProgram:XJ,setBlending:lJ,setMaterial:zJ,setFlipSided:vJ,setCullFace:UJ,setLineWidth:dJ,setPolygonOffset:NJ,setScissorTest:WJ,activeTexture:z,bindTexture:R,unbindTexture:h,compressedTexImage2D:i,compressedTexImage3D:t,texImage2D:DJ,texImage3D:sJ,updateUBOMapping:bJ,uniformBlockBinding:cJ,texStorage2D:hJ,texStorage3D:QJ,texSubImage2D:u,texSubImage3D:TJ,compressedTexSubImage2D:HJ,compressedTexSubImage3D:RJ,scissor:jJ,viewport:OJ,reset:X0}}function k5(J,$,Q,Z){let W=zY(Z);switch(Q){case 1021:return J*$;case 1024:return J*$;case 1025:return J*$*2;case 1028:return J*$/W.components*W.byteLength;case 1029:return J*$/W.components*W.byteLength;case 1030:return J*$*2/W.components*W.byteLength;case 1031:return J*$*2/W.components*W.byteLength;case 1022:return J*$*3/W.components*W.byteLength;case 1023:return J*$*4/W.components*W.byteLength;case 1033:return J*$*4/W.components*W.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max($,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max($,8)/2;case 36196:case 37492:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*8;case 37496:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor(($+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor(($+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor(($+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor(($+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor(($+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor(($+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor(($+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor(($+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor(($+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor(($+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor(($+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor(($+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor(($+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil($/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil($/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil($/4)*16}throw Error(`Unable to determine texture byte length for ${Q} format.`)}function zY(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${J}.`)}function kY(J,$,Q,Z,W,Y,K){let X=$.has("WEBGL_multisampled_render_to_texture")?$.get("WEBGL_multisampled_render_to_texture"):null,G=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new MJ,V=new WeakMap,H,q=new WeakMap,D=!1;try{D=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(z){}function A(z,R){return D?new OffscreenCanvas(z,R):t7("canvas")}function O(z,R,h){let i=1,t=WJ(z);if(t.width>h||t.height>h)i=h/Math.max(t.width,t.height);if(i<1)if(typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&z instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&z instanceof ImageBitmap||typeof VideoFrame<"u"&&z instanceof VideoFrame){let u=Math.floor(i*t.width),TJ=Math.floor(i*t.height);if(H===void 0)H=A(u,TJ);let HJ=R?A(u,TJ):H;return HJ.width=u,HJ.height=TJ,HJ.getContext("2d").drawImage(z,0,0,u,TJ),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+t.width+"x"+t.height+") to ("+u+"x"+TJ+")."),HJ}else{if("data"in z)console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+t.width+"x"+t.height+").");return z}return z}function F(z){return z.generateMipmaps}function E(z){J.generateMipmap(z)}function _(z){if(z.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(z.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(z.isWebGLArrayRenderTarget||z.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function N(z,R,h,i,t=!1){if(z!==null){if(J[z]!==void 0)return J[z];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+z+"'")}let u=R;if(R===J.RED){if(h===J.FLOAT)u=J.R32F;if(h===J.HALF_FLOAT)u=J.R16F;if(h===J.UNSIGNED_BYTE)u=J.R8}if(R===J.RED_INTEGER){if(h===J.UNSIGNED_BYTE)u=J.R8UI;if(h===J.UNSIGNED_SHORT)u=J.R16UI;if(h===J.UNSIGNED_INT)u=J.R32UI;if(h===J.BYTE)u=J.R8I;if(h===J.SHORT)u=J.R16I;if(h===J.INT)u=J.R32I}if(R===J.RG){if(h===J.FLOAT)u=J.RG32F;if(h===J.HALF_FLOAT)u=J.RG16F;if(h===J.UNSIGNED_BYTE)u=J.RG8}if(R===J.RG_INTEGER){if(h===J.UNSIGNED_BYTE)u=J.RG8UI;if(h===J.UNSIGNED_SHORT)u=J.RG16UI;if(h===J.UNSIGNED_INT)u=J.RG32UI;if(h===J.BYTE)u=J.RG8I;if(h===J.SHORT)u=J.RG16I;if(h===J.INT)u=J.RG32I}if(R===J.RGB_INTEGER){if(h===J.UNSIGNED_BYTE)u=J.RGB8UI;if(h===J.UNSIGNED_SHORT)u=J.RGB16UI;if(h===J.UNSIGNED_INT)u=J.RGB32UI;if(h===J.BYTE)u=J.RGB8I;if(h===J.SHORT)u=J.RGB16I;if(h===J.INT)u=J.RGB32I}if(R===J.RGBA_INTEGER){if(h===J.UNSIGNED_BYTE)u=J.RGBA8UI;if(h===J.UNSIGNED_SHORT)u=J.RGBA16UI;if(h===J.UNSIGNED_INT)u=J.RGBA32UI;if(h===J.BYTE)u=J.RGBA8I;if(h===J.SHORT)u=J.RGBA16I;if(h===J.INT)u=J.RGBA32I}if(R===J.RGB){if(h===J.UNSIGNED_INT_5_9_9_9_REV)u=J.RGB9_E5}if(R===J.RGBA){let TJ=t?"linear":oJ.getTransfer(i);if(h===J.FLOAT)u=J.RGBA32F;if(h===J.HALF_FLOAT)u=J.RGBA16F;if(h===J.UNSIGNED_BYTE)u=TJ==="srgb"?J.SRGB8_ALPHA8:J.RGBA8;if(h===J.UNSIGNED_SHORT_4_4_4_4)u=J.RGBA4;if(h===J.UNSIGNED_SHORT_5_5_5_1)u=J.RGB5_A1}if(u===J.R16F||u===J.R32F||u===J.RG16F||u===J.RG32F||u===J.RGBA16F||u===J.RGBA32F)$.get("EXT_color_buffer_float");return u}function C(z,R){let h;if(z){if(R===null||R===1014||R===1020)h=J.DEPTH24_STENCIL8;else if(R===1015)h=J.DEPTH32F_STENCIL8;else if(R===1012)h=J.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(R===null||R===1014||R===1020)h=J.DEPTH_COMPONENT24;else if(R===1015)h=J.DEPTH_COMPONENT32F;else if(R===1012)h=J.DEPTH_COMPONENT16;return h}function f(z,R){if(F(z)===!0||z.isFramebufferTexture&&z.minFilter!==1003&&z.minFilter!==1006)return Math.log2(Math.max(R.width,R.height))+1;else if(z.mipmaps!==void 0&&z.mipmaps.length>0)return z.mipmaps.length;else if(z.isCompressedTexture&&Array.isArray(z.image))return R.mipmaps.length;else return 1}function k(z){let R=z.target;if(R.removeEventListener("dispose",k),b(R),R.isVideoTexture)V.delete(R)}function w(z){let R=z.target;R.removeEventListener("dispose",w),L(R)}function b(z){let R=Z.get(z);if(R.__webglInit===void 0)return;let h=z.source,i=q.get(h);if(i){let t=i[R.__cacheKey];if(t.usedTimes--,t.usedTimes===0)B(z);if(Object.keys(i).length===0)q.delete(h)}Z.remove(z)}function B(z){let R=Z.get(z);J.deleteTexture(R.__webglTexture);let h=z.source,i=q.get(h);delete i[R.__cacheKey],K.memory.textures--}function L(z){let R=Z.get(z);if(z.depthTexture)z.depthTexture.dispose(),Z.remove(z.depthTexture);if(z.isWebGLCubeRenderTarget)for(let i=0;i<6;i++){if(Array.isArray(R.__webglFramebuffer[i]))for(let t=0;t<R.__webglFramebuffer[i].length;t++)J.deleteFramebuffer(R.__webglFramebuffer[i][t]);else J.deleteFramebuffer(R.__webglFramebuffer[i]);if(R.__webglDepthbuffer)J.deleteRenderbuffer(R.__webglDepthbuffer[i])}else{if(Array.isArray(R.__webglFramebuffer))for(let i=0;i<R.__webglFramebuffer.length;i++)J.deleteFramebuffer(R.__webglFramebuffer[i]);else J.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer)J.deleteRenderbuffer(R.__webglDepthbuffer);if(R.__webglMultisampledFramebuffer)J.deleteFramebuffer(R.__webglMultisampledFramebuffer);if(R.__webglColorRenderbuffer){for(let i=0;i<R.__webglColorRenderbuffer.length;i++)if(R.__webglColorRenderbuffer[i])J.deleteRenderbuffer(R.__webglColorRenderbuffer[i])}if(R.__webglDepthRenderbuffer)J.deleteRenderbuffer(R.__webglDepthRenderbuffer)}let h=z.textures;for(let i=0,t=h.length;i<t;i++){let u=Z.get(h[i]);if(u.__webglTexture)J.deleteTexture(u.__webglTexture),K.memory.textures--;Z.remove(h[i])}Z.remove(z)}let S=0;function x(){S=0}function l(){let z=S;if(z>=W.maxTextures)console.warn("THREE.WebGLTextures: Trying to use "+z+" texture units while this GPU supports only "+W.maxTextures);return S+=1,z}function s(z){let R=[];return R.push(z.wrapS),R.push(z.wrapT),R.push(z.wrapR||0),R.push(z.magFilter),R.push(z.minFilter),R.push(z.anisotropy),R.push(z.internalFormat),R.push(z.format),R.push(z.type),R.push(z.generateMipmaps),R.push(z.premultiplyAlpha),R.push(z.flipY),R.push(z.unpackAlignment),R.push(z.colorSpace),R.join()}function d(z,R){let h=Z.get(z);if(z.isVideoTexture)dJ(z);if(z.isRenderTargetTexture===!1&&z.version>0&&h.__version!==z.version){let i=z.image;if(i===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(i.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{JJ(h,z,R);return}}Q.bindTexture(J.TEXTURE_2D,h.__webglTexture,J.TEXTURE0+R)}function c(z,R){let h=Z.get(z);if(z.version>0&&h.__version!==z.version){JJ(h,z,R);return}Q.bindTexture(J.TEXTURE_2D_ARRAY,h.__webglTexture,J.TEXTURE0+R)}function e(z,R){let h=Z.get(z);if(z.version>0&&h.__version!==z.version){JJ(h,z,R);return}Q.bindTexture(J.TEXTURE_3D,h.__webglTexture,J.TEXTURE0+R)}function m(z,R){let h=Z.get(z);if(z.version>0&&h.__version!==z.version){IJ(h,z,R);return}Q.bindTexture(J.TEXTURE_CUBE_MAP,h.__webglTexture,J.TEXTURE0+R)}let YJ={[1000]:J.REPEAT,[1001]:J.CLAMP_TO_EDGE,[1002]:J.MIRRORED_REPEAT},GJ={[1003]:J.NEAREST,[1004]:J.NEAREST_MIPMAP_NEAREST,[1005]:J.NEAREST_MIPMAP_LINEAR,[1006]:J.LINEAR,[1007]:J.LINEAR_MIPMAP_NEAREST,[1008]:J.LINEAR_MIPMAP_LINEAR},wJ={[512]:J.NEVER,[519]:J.ALWAYS,[513]:J.LESS,[515]:J.LEQUAL,[514]:J.EQUAL,[518]:J.GEQUAL,[516]:J.GREATER,[517]:J.NOTEQUAL};function pJ(z,R){if(R.type===1015&&$.has("OES_texture_float_linear")===!1&&(R.magFilter===1006||R.magFilter===1007||R.magFilter===1005||R.magFilter===1008||R.minFilter===1006||R.minFilter===1007||R.minFilter===1005||R.minFilter===1008))console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(z,J.TEXTURE_WRAP_S,YJ[R.wrapS]),J.texParameteri(z,J.TEXTURE_WRAP_T,YJ[R.wrapT]),z===J.TEXTURE_3D||z===J.TEXTURE_2D_ARRAY)J.texParameteri(z,J.TEXTURE_WRAP_R,YJ[R.wrapR]);if(J.texParameteri(z,J.TEXTURE_MAG_FILTER,GJ[R.magFilter]),J.texParameteri(z,J.TEXTURE_MIN_FILTER,GJ[R.minFilter]),R.compareFunction)J.texParameteri(z,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(z,J.TEXTURE_COMPARE_FUNC,wJ[R.compareFunction]);if($.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===1003)return;if(R.minFilter!==1005&&R.minFilter!==1008)return;if(R.type===1015&&$.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||Z.get(R).__currentAnisotropy){let h=$.get("EXT_texture_filter_anisotropic");J.texParameterf(z,h.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,W.getMaxAnisotropy())),Z.get(R).__currentAnisotropy=R.anisotropy}}}function o(z,R){let h=!1;if(z.__webglInit===void 0)z.__webglInit=!0,R.addEventListener("dispose",k);let i=R.source,t=q.get(i);if(t===void 0)t={},q.set(i,t);let u=s(R);if(u!==z.__cacheKey){if(t[u]===void 0)t[u]={texture:J.createTexture(),usedTimes:0},K.memory.textures++,h=!0;t[u].usedTimes++;let TJ=t[z.__cacheKey];if(TJ!==void 0){if(t[z.__cacheKey].usedTimes--,TJ.usedTimes===0)B(R)}z.__cacheKey=u,z.__webglTexture=t[u].texture}return h}function JJ(z,R,h){let i=J.TEXTURE_2D;if(R.isDataArrayTexture||R.isCompressedArrayTexture)i=J.TEXTURE_2D_ARRAY;if(R.isData3DTexture)i=J.TEXTURE_3D;let t=o(z,R),u=R.source;Q.bindTexture(i,z.__webglTexture,J.TEXTURE0+h);let TJ=Z.get(u);if(u.version!==TJ.__version||t===!0){Q.activeTexture(J.TEXTURE0+h);let HJ=oJ.getPrimaries(oJ.workingColorSpace),RJ=R.colorSpace===""?null:oJ.getPrimaries(R.colorSpace),hJ=R.colorSpace===""||HJ===RJ?J.NONE:J.BROWSER_DEFAULT_WEBGL;J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,R.flipY),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),J.pixelStorei(J.UNPACK_ALIGNMENT,R.unpackAlignment),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,hJ);let QJ=O(R.image,!1,W.maxTextureSize);QJ=NJ(R,QJ);let DJ=Y.convert(R.format,R.colorSpace),sJ=Y.convert(R.type),jJ=N(R.internalFormat,DJ,sJ,R.colorSpace,R.isVideoTexture);pJ(i,R);let OJ,bJ=R.mipmaps,cJ=R.isVideoTexture!==!0,X0=TJ.__version===void 0||t===!0,y=u.dataReady,$J=f(R,QJ);if(R.isDepthTexture){if(jJ=C(R.format===1027,R.type),X0)if(cJ)Q.texStorage2D(J.TEXTURE_2D,1,jJ,QJ.width,QJ.height);else Q.texImage2D(J.TEXTURE_2D,0,jJ,QJ.width,QJ.height,0,DJ,sJ,null)}else if(R.isDataTexture)if(bJ.length>0){if(cJ&&X0)Q.texStorage2D(J.TEXTURE_2D,$J,jJ,bJ[0].width,bJ[0].height);for(let a=0,r=bJ.length;a<r;a++)if(OJ=bJ[a],cJ){if(y)Q.texSubImage2D(J.TEXTURE_2D,a,0,0,OJ.width,OJ.height,DJ,sJ,OJ.data)}else Q.texImage2D(J.TEXTURE_2D,a,jJ,OJ.width,OJ.height,0,DJ,sJ,OJ.data);R.generateMipmaps=!1}else if(cJ){if(X0)Q.texStorage2D(J.TEXTURE_2D,$J,jJ,QJ.width,QJ.height);if(y)Q.texSubImage2D(J.TEXTURE_2D,0,0,0,QJ.width,QJ.height,DJ,sJ,QJ.data)}else Q.texImage2D(J.TEXTURE_2D,0,jJ,QJ.width,QJ.height,0,DJ,sJ,QJ.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){if(cJ&&X0)Q.texStorage3D(J.TEXTURE_2D_ARRAY,$J,jJ,bJ[0].width,bJ[0].height,QJ.depth);for(let a=0,r=bJ.length;a<r;a++)if(OJ=bJ[a],R.format!==1023)if(DJ!==null)if(cJ){if(y)if(R.layerUpdates.size>0){let EJ=k5(OJ.width,OJ.height,R.format,R.type);for(let VJ of R.layerUpdates){let mJ=OJ.data.subarray(VJ*EJ/OJ.data.BYTES_PER_ELEMENT,(VJ+1)*EJ/OJ.data.BYTES_PER_ELEMENT);Q.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,a,0,0,VJ,OJ.width,OJ.height,1,DJ,mJ)}R.clearLayerUpdates()}else Q.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,a,0,0,0,OJ.width,OJ.height,QJ.depth,DJ,OJ.data)}else Q.compressedTexImage3D(J.TEXTURE_2D_ARRAY,a,jJ,OJ.width,OJ.height,QJ.depth,0,OJ.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(cJ){if(y)Q.texSubImage3D(J.TEXTURE_2D_ARRAY,a,0,0,0,OJ.width,OJ.height,QJ.depth,DJ,sJ,OJ.data)}else Q.texImage3D(J.TEXTURE_2D_ARRAY,a,jJ,OJ.width,OJ.height,QJ.depth,0,DJ,sJ,OJ.data)}else{if(cJ&&X0)Q.texStorage2D(J.TEXTURE_2D,$J,jJ,bJ[0].width,bJ[0].height);for(let a=0,r=bJ.length;a<r;a++)if(OJ=bJ[a],R.format!==1023)if(DJ!==null)if(cJ){if(y)Q.compressedTexSubImage2D(J.TEXTURE_2D,a,0,0,OJ.width,OJ.height,DJ,OJ.data)}else Q.compressedTexImage2D(J.TEXTURE_2D,a,jJ,OJ.width,OJ.height,0,OJ.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(cJ){if(y)Q.texSubImage2D(J.TEXTURE_2D,a,0,0,OJ.width,OJ.height,DJ,sJ,OJ.data)}else Q.texImage2D(J.TEXTURE_2D,a,jJ,OJ.width,OJ.height,0,DJ,sJ,OJ.data)}else if(R.isDataArrayTexture)if(cJ){if(X0)Q.texStorage3D(J.TEXTURE_2D_ARRAY,$J,jJ,QJ.width,QJ.height,QJ.depth);if(y)if(R.layerUpdates.size>0){let a=k5(QJ.width,QJ.height,R.format,R.type);for(let r of R.layerUpdates){let EJ=QJ.data.subarray(r*a/QJ.data.BYTES_PER_ELEMENT,(r+1)*a/QJ.data.BYTES_PER_ELEMENT);Q.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,r,QJ.width,QJ.height,1,DJ,sJ,EJ)}R.clearLayerUpdates()}else Q.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,QJ.width,QJ.height,QJ.depth,DJ,sJ,QJ.data)}else Q.texImage3D(J.TEXTURE_2D_ARRAY,0,jJ,QJ.width,QJ.height,QJ.depth,0,DJ,sJ,QJ.data);else if(R.isData3DTexture)if(cJ){if(X0)Q.texStorage3D(J.TEXTURE_3D,$J,jJ,QJ.width,QJ.height,QJ.depth);if(y)Q.texSubImage3D(J.TEXTURE_3D,0,0,0,0,QJ.width,QJ.height,QJ.depth,DJ,sJ,QJ.data)}else Q.texImage3D(J.TEXTURE_3D,0,jJ,QJ.width,QJ.height,QJ.depth,0,DJ,sJ,QJ.data);else if(R.isFramebufferTexture){if(X0)if(cJ)Q.texStorage2D(J.TEXTURE_2D,$J,jJ,QJ.width,QJ.height);else{let{width:a,height:r}=QJ;for(let EJ=0;EJ<$J;EJ++)Q.texImage2D(J.TEXTURE_2D,EJ,jJ,a,r,0,DJ,sJ,null),a>>=1,r>>=1}}else if(bJ.length>0){if(cJ&&X0){let a=WJ(bJ[0]);Q.texStorage2D(J.TEXTURE_2D,$J,jJ,a.width,a.height)}for(let a=0,r=bJ.length;a<r;a++)if(OJ=bJ[a],cJ){if(y)Q.texSubImage2D(J.TEXTURE_2D,a,0,0,DJ,sJ,OJ)}else Q.texImage2D(J.TEXTURE_2D,a,jJ,DJ,sJ,OJ);R.generateMipmaps=!1}else if(cJ){if(X0){let a=WJ(QJ);Q.texStorage2D(J.TEXTURE_2D,$J,jJ,a.width,a.height)}if(y)Q.texSubImage2D(J.TEXTURE_2D,0,0,0,DJ,sJ,QJ)}else Q.texImage2D(J.TEXTURE_2D,0,jJ,DJ,sJ,QJ);if(F(R))E(i);if(TJ.__version=u.version,R.onUpdate)R.onUpdate(R)}z.__version=R.version}function IJ(z,R,h){if(R.image.length!==6)return;let i=o(z,R),t=R.source;Q.bindTexture(J.TEXTURE_CUBE_MAP,z.__webglTexture,J.TEXTURE0+h);let u=Z.get(t);if(t.version!==u.__version||i===!0){Q.activeTexture(J.TEXTURE0+h);let TJ=oJ.getPrimaries(oJ.workingColorSpace),HJ=R.colorSpace===""?null:oJ.getPrimaries(R.colorSpace),RJ=R.colorSpace===""||TJ===HJ?J.NONE:J.BROWSER_DEFAULT_WEBGL;J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,R.flipY),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),J.pixelStorei(J.UNPACK_ALIGNMENT,R.unpackAlignment),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,RJ);let hJ=R.isCompressedTexture||R.image[0].isCompressedTexture,QJ=R.image[0]&&R.image[0].isDataTexture,DJ=[];for(let r=0;r<6;r++){if(!hJ&&!QJ)DJ[r]=O(R.image[r],!0,W.maxCubemapSize);else DJ[r]=QJ?R.image[r].image:R.image[r];DJ[r]=NJ(R,DJ[r])}let sJ=DJ[0],jJ=Y.convert(R.format,R.colorSpace),OJ=Y.convert(R.type),bJ=N(R.internalFormat,jJ,OJ,R.colorSpace),cJ=R.isVideoTexture!==!0,X0=u.__version===void 0||i===!0,y=t.dataReady,$J=f(R,sJ);pJ(J.TEXTURE_CUBE_MAP,R);let a;if(hJ){if(cJ&&X0)Q.texStorage2D(J.TEXTURE_CUBE_MAP,$J,bJ,sJ.width,sJ.height);for(let r=0;r<6;r++){a=DJ[r].mipmaps;for(let EJ=0;EJ<a.length;EJ++){let VJ=a[EJ];if(R.format!==1023)if(jJ!==null)if(cJ){if(y)Q.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,0,0,VJ.width,VJ.height,jJ,VJ.data)}else Q.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,bJ,VJ.width,VJ.height,0,VJ.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(cJ){if(y)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,0,0,VJ.width,VJ.height,jJ,OJ,VJ.data)}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,bJ,VJ.width,VJ.height,0,jJ,OJ,VJ.data)}}}else{if(a=R.mipmaps,cJ&&X0){if(a.length>0)$J++;let r=WJ(DJ[0]);Q.texStorage2D(J.TEXTURE_CUBE_MAP,$J,bJ,r.width,r.height)}for(let r=0;r<6;r++)if(QJ){if(cJ){if(y)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,0,0,DJ[r].width,DJ[r].height,jJ,OJ,DJ[r].data)}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,bJ,DJ[r].width,DJ[r].height,0,jJ,OJ,DJ[r].data);for(let EJ=0;EJ<a.length;EJ++){let mJ=a[EJ].image[r].image;if(cJ){if(y)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,0,0,mJ.width,mJ.height,jJ,OJ,mJ.data)}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,bJ,mJ.width,mJ.height,0,jJ,OJ,mJ.data)}}else{if(cJ){if(y)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,0,0,jJ,OJ,DJ[r])}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,bJ,jJ,OJ,DJ[r]);for(let EJ=0;EJ<a.length;EJ++){let VJ=a[EJ];if(cJ){if(y)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,0,0,jJ,OJ,VJ.image[r])}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,bJ,jJ,OJ,VJ.image[r])}}}if(F(R))E(J.TEXTURE_CUBE_MAP);if(u.__version=t.version,R.onUpdate)R.onUpdate(R)}z.__version=R.version}function SJ(z,R,h,i,t,u){let TJ=Y.convert(h.format,h.colorSpace),HJ=Y.convert(h.type),RJ=N(h.internalFormat,TJ,HJ,h.colorSpace),hJ=Z.get(R),QJ=Z.get(h);if(QJ.__renderTarget=R,!hJ.__hasExternalTextures){let DJ=Math.max(1,R.width>>u),sJ=Math.max(1,R.height>>u);if(t===J.TEXTURE_3D||t===J.TEXTURE_2D_ARRAY)Q.texImage3D(t,u,RJ,DJ,sJ,R.depth,0,TJ,HJ,null);else Q.texImage2D(t,u,RJ,DJ,sJ,0,TJ,HJ,null)}if(Q.bindFramebuffer(J.FRAMEBUFFER,z),UJ(R))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,t,QJ.__webglTexture,0,vJ(R));else if(t===J.TEXTURE_2D||t>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&t<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,i,t,QJ.__webglTexture,u);Q.bindFramebuffer(J.FRAMEBUFFER,null)}function I(z,R,h){if(J.bindRenderbuffer(J.RENDERBUFFER,z),R.depthBuffer){let i=R.depthTexture,t=i&&i.isDepthTexture?i.type:null,u=C(R.stencilBuffer,t),TJ=R.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,HJ=vJ(R);if(UJ(R))X.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,HJ,u,R.width,R.height);else if(h)J.renderbufferStorageMultisample(J.RENDERBUFFER,HJ,u,R.width,R.height);else J.renderbufferStorage(J.RENDERBUFFER,u,R.width,R.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,TJ,J.RENDERBUFFER,z)}else{let i=R.textures;for(let t=0;t<i.length;t++){let u=i[t],TJ=Y.convert(u.format,u.colorSpace),HJ=Y.convert(u.type),RJ=N(u.internalFormat,TJ,HJ,u.colorSpace),hJ=vJ(R);if(h&&UJ(R)===!1)J.renderbufferStorageMultisample(J.RENDERBUFFER,hJ,RJ,R.width,R.height);else if(UJ(R))X.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,hJ,RJ,R.width,R.height);else J.renderbufferStorage(J.RENDERBUFFER,RJ,R.width,R.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function FJ(z,R){if(R&&R.isWebGLCubeRenderTarget)throw Error("Depth Texture with cube render targets is not supported");if(Q.bindFramebuffer(J.FRAMEBUFFER,z),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let i=Z.get(R.depthTexture);if(i.__renderTarget=R,!i.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0;d(R.depthTexture,0);let t=i.__webglTexture,u=vJ(R);if(R.depthTexture.format===1026)if(UJ(R))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,J.DEPTH_ATTACHMENT,J.TEXTURE_2D,t,0,u);else J.framebufferTexture2D(J.FRAMEBUFFER,J.DEPTH_ATTACHMENT,J.TEXTURE_2D,t,0);else if(R.depthTexture.format===1027)if(UJ(R))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,J.DEPTH_STENCIL_ATTACHMENT,J.TEXTURE_2D,t,0,u);else J.framebufferTexture2D(J.FRAMEBUFFER,J.DEPTH_STENCIL_ATTACHMENT,J.TEXTURE_2D,t,0);else throw Error("Unknown depthTexture format")}function kJ(z){let R=Z.get(z),h=z.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==z.depthTexture){let i=z.depthTexture;if(R.__depthDisposeCallback)R.__depthDisposeCallback();if(i){let t=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,i.removeEventListener("dispose",t)};i.addEventListener("dispose",t),R.__depthDisposeCallback=t}R.__boundDepthTexture=i}if(z.depthTexture&&!R.__autoAllocateDepthBuffer){if(h)throw Error("target.depthTexture not supported in Cube render targets");FJ(R.__webglFramebuffer,z)}else if(h){R.__webglDepthbuffer=[];for(let i=0;i<6;i++)if(Q.bindFramebuffer(J.FRAMEBUFFER,R.__webglFramebuffer[i]),R.__webglDepthbuffer[i]===void 0)R.__webglDepthbuffer[i]=J.createRenderbuffer(),I(R.__webglDepthbuffer[i],z,!1);else{let t=z.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,u=R.__webglDepthbuffer[i];J.bindRenderbuffer(J.RENDERBUFFER,u),J.framebufferRenderbuffer(J.FRAMEBUFFER,t,J.RENDERBUFFER,u)}}else if(Q.bindFramebuffer(J.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=J.createRenderbuffer(),I(R.__webglDepthbuffer,z,!1);else{let i=z.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,t=R.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,t),J.framebufferRenderbuffer(J.FRAMEBUFFER,i,J.RENDERBUFFER,t)}Q.bindFramebuffer(J.FRAMEBUFFER,null)}function BJ(z,R,h){let i=Z.get(z);if(R!==void 0)SJ(i.__webglFramebuffer,z,z.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(h!==void 0)kJ(z)}function XJ(z){let R=z.texture,h=Z.get(z),i=Z.get(R);z.addEventListener("dispose",w);let t=z.textures,u=z.isWebGLCubeRenderTarget===!0,TJ=t.length>1;if(!TJ){if(i.__webglTexture===void 0)i.__webglTexture=J.createTexture();i.__version=R.version,K.memory.textures++}if(u){h.__webglFramebuffer=[];for(let HJ=0;HJ<6;HJ++)if(R.mipmaps&&R.mipmaps.length>0){h.__webglFramebuffer[HJ]=[];for(let RJ=0;RJ<R.mipmaps.length;RJ++)h.__webglFramebuffer[HJ][RJ]=J.createFramebuffer()}else h.__webglFramebuffer[HJ]=J.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){h.__webglFramebuffer=[];for(let HJ=0;HJ<R.mipmaps.length;HJ++)h.__webglFramebuffer[HJ]=J.createFramebuffer()}else h.__webglFramebuffer=J.createFramebuffer();if(TJ)for(let HJ=0,RJ=t.length;HJ<RJ;HJ++){let hJ=Z.get(t[HJ]);if(hJ.__webglTexture===void 0)hJ.__webglTexture=J.createTexture(),K.memory.textures++}if(z.samples>0&&UJ(z)===!1){h.__webglMultisampledFramebuffer=J.createFramebuffer(),h.__webglColorRenderbuffer=[],Q.bindFramebuffer(J.FRAMEBUFFER,h.__webglMultisampledFramebuffer);for(let HJ=0;HJ<t.length;HJ++){let RJ=t[HJ];h.__webglColorRenderbuffer[HJ]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,h.__webglColorRenderbuffer[HJ]);let hJ=Y.convert(RJ.format,RJ.colorSpace),QJ=Y.convert(RJ.type),DJ=N(RJ.internalFormat,hJ,QJ,RJ.colorSpace,z.isXRRenderTarget===!0),sJ=vJ(z);J.renderbufferStorageMultisample(J.RENDERBUFFER,sJ,DJ,z.width,z.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+HJ,J.RENDERBUFFER,h.__webglColorRenderbuffer[HJ])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),z.depthBuffer)h.__webglDepthRenderbuffer=J.createRenderbuffer(),I(h.__webglDepthRenderbuffer,z,!0);Q.bindFramebuffer(J.FRAMEBUFFER,null)}}if(u){Q.bindTexture(J.TEXTURE_CUBE_MAP,i.__webglTexture),pJ(J.TEXTURE_CUBE_MAP,R);for(let HJ=0;HJ<6;HJ++)if(R.mipmaps&&R.mipmaps.length>0)for(let RJ=0;RJ<R.mipmaps.length;RJ++)SJ(h.__webglFramebuffer[HJ][RJ],z,R,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+HJ,RJ);else SJ(h.__webglFramebuffer[HJ],z,R,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+HJ,0);if(F(R))E(J.TEXTURE_CUBE_MAP);Q.unbindTexture()}else if(TJ){for(let HJ=0,RJ=t.length;HJ<RJ;HJ++){let hJ=t[HJ],QJ=Z.get(hJ);if(Q.bindTexture(J.TEXTURE_2D,QJ.__webglTexture),pJ(J.TEXTURE_2D,hJ),SJ(h.__webglFramebuffer,z,hJ,J.COLOR_ATTACHMENT0+HJ,J.TEXTURE_2D,0),F(hJ))E(J.TEXTURE_2D)}Q.unbindTexture()}else{let HJ=J.TEXTURE_2D;if(z.isWebGL3DRenderTarget||z.isWebGLArrayRenderTarget)HJ=z.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if(Q.bindTexture(HJ,i.__webglTexture),pJ(HJ,R),R.mipmaps&&R.mipmaps.length>0)for(let RJ=0;RJ<R.mipmaps.length;RJ++)SJ(h.__webglFramebuffer[RJ],z,R,J.COLOR_ATTACHMENT0,HJ,RJ);else SJ(h.__webglFramebuffer,z,R,J.COLOR_ATTACHMENT0,HJ,0);if(F(R))E(HJ);Q.unbindTexture()}if(z.depthBuffer)kJ(z)}function yJ(z){let R=z.textures;for(let h=0,i=R.length;h<i;h++){let t=R[h];if(F(t)){let u=_(z),TJ=Z.get(t).__webglTexture;Q.bindTexture(u,TJ),E(u),Q.unbindTexture()}}}let P=[],lJ=[];function zJ(z){if(z.samples>0){if(UJ(z)===!1){let{textures:R,width:h,height:i}=z,t=J.COLOR_BUFFER_BIT,u=z.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,TJ=Z.get(z),HJ=R.length>1;if(HJ)for(let RJ=0;RJ<R.length;RJ++)Q.bindFramebuffer(J.FRAMEBUFFER,TJ.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+RJ,J.RENDERBUFFER,null),Q.bindFramebuffer(J.FRAMEBUFFER,TJ.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+RJ,J.TEXTURE_2D,null,0);Q.bindFramebuffer(J.READ_FRAMEBUFFER,TJ.__webglMultisampledFramebuffer),Q.bindFramebuffer(J.DRAW_FRAMEBUFFER,TJ.__webglFramebuffer);for(let RJ=0;RJ<R.length;RJ++){if(z.resolveDepthBuffer){if(z.depthBuffer)t|=J.DEPTH_BUFFER_BIT;if(z.stencilBuffer&&z.resolveStencilBuffer)t|=J.STENCIL_BUFFER_BIT}if(HJ){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,TJ.__webglColorRenderbuffer[RJ]);let hJ=Z.get(R[RJ]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,hJ,0)}if(J.blitFramebuffer(0,0,h,i,0,0,h,i,t,J.NEAREST),G===!0){if(P.length=0,lJ.length=0,P.push(J.COLOR_ATTACHMENT0+RJ),z.depthBuffer&&z.resolveDepthBuffer===!1)P.push(u),lJ.push(u),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,lJ);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,P)}}if(Q.bindFramebuffer(J.READ_FRAMEBUFFER,null),Q.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),HJ)for(let RJ=0;RJ<R.length;RJ++){Q.bindFramebuffer(J.FRAMEBUFFER,TJ.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+RJ,J.RENDERBUFFER,TJ.__webglColorRenderbuffer[RJ]);let hJ=Z.get(R[RJ]).__webglTexture;Q.bindFramebuffer(J.FRAMEBUFFER,TJ.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+RJ,J.TEXTURE_2D,hJ,0)}Q.bindFramebuffer(J.DRAW_FRAMEBUFFER,TJ.__webglMultisampledFramebuffer)}else if(z.depthBuffer&&z.resolveDepthBuffer===!1&&G){let R=z.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[R])}}}function vJ(z){return Math.min(W.maxSamples,z.samples)}function UJ(z){let R=Z.get(z);return z.samples>0&&$.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function dJ(z){let R=K.render.frame;if(V.get(z)!==R)V.set(z,R),z.update()}function NJ(z,R){let{colorSpace:h,format:i,type:t}=z;if(z.isCompressedTexture===!0||z.isVideoTexture===!0)return R;if(h!=="srgb-linear"&&h!=="")if(oJ.getTransfer(h)==="srgb"){if(i!==1023||t!==1009)console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else console.error("THREE.WebGLTextures: Unsupported texture color space:",h);return R}function WJ(z){if(typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement)U.width=z.naturalWidth||z.width,U.height=z.naturalHeight||z.height;else if(typeof VideoFrame<"u"&&z instanceof VideoFrame)U.width=z.displayWidth,U.height=z.displayHeight;else U.width=z.width,U.height=z.height;return U}this.allocateTextureUnit=l,this.resetTextureUnits=x,this.setTexture2D=d,this.setTexture2DArray=c,this.setTexture3D=e,this.setTextureCube=m,this.rebindTextures=BJ,this.setupRenderTarget=XJ,this.updateRenderTargetMipmap=yJ,this.updateMultisampleRenderTarget=zJ,this.setupDepthRenderbuffer=kJ,this.setupFrameBufferTexture=SJ,this.useMultisampledRTT=UJ}function CY(J,$){function Q(Z,W=""){let Y,K=oJ.getTransfer(W);if(Z===1009)return J.UNSIGNED_BYTE;if(Z===1017)return J.UNSIGNED_SHORT_4_4_4_4;if(Z===1018)return J.UNSIGNED_SHORT_5_5_5_1;if(Z===35902)return J.UNSIGNED_INT_5_9_9_9_REV;if(Z===1010)return J.BYTE;if(Z===1011)return J.SHORT;if(Z===1012)return J.UNSIGNED_SHORT;if(Z===1013)return J.INT;if(Z===1014)return J.UNSIGNED_INT;if(Z===1015)return J.FLOAT;if(Z===1016)return J.HALF_FLOAT;if(Z===1021)return J.ALPHA;if(Z===1022)return J.RGB;if(Z===1023)return J.RGBA;if(Z===1024)return J.LUMINANCE;if(Z===1025)return J.LUMINANCE_ALPHA;if(Z===1026)return J.DEPTH_COMPONENT;if(Z===1027)return J.DEPTH_STENCIL;if(Z===1028)return J.RED;if(Z===1029)return J.RED_INTEGER;if(Z===1030)return J.RG;if(Z===1031)return J.RG_INTEGER;if(Z===1033)return J.RGBA_INTEGER;if(Z===33776||Z===33777||Z===33778||Z===33779)if(K==="srgb")if(Y=$.get("WEBGL_compressed_texture_s3tc_srgb"),Y!==null){if(Z===33776)return Y.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===33777)return Y.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===33778)return Y.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===33779)return Y.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(Y=$.get("WEBGL_compressed_texture_s3tc"),Y!==null){if(Z===33776)return Y.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===33777)return Y.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===33778)return Y.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===33779)return Y.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===35840||Z===35841||Z===35842||Z===35843)if(Y=$.get("WEBGL_compressed_texture_pvrtc"),Y!==null){if(Z===35840)return Y.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===35841)return Y.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===35842)return Y.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===35843)return Y.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===36196||Z===37492||Z===37496)if(Y=$.get("WEBGL_compressed_texture_etc"),Y!==null){if(Z===36196||Z===37492)return K==="srgb"?Y.COMPRESSED_SRGB8_ETC2:Y.COMPRESSED_RGB8_ETC2;if(Z===37496)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:Y.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(Z===37808||Z===37809||Z===37810||Z===37811||Z===37812||Z===37813||Z===37814||Z===37815||Z===37816||Z===37817||Z===37818||Z===37819||Z===37820||Z===37821)if(Y=$.get("WEBGL_compressed_texture_astc"),Y!==null){if(Z===37808)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:Y.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===37809)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:Y.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===37810)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:Y.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===37811)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:Y.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===37812)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:Y.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===37813)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:Y.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===37814)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:Y.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===37815)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:Y.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===37816)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:Y.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===37817)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:Y.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===37818)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:Y.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===37819)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:Y.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===37820)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:Y.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===37821)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:Y.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===36492||Z===36494||Z===36495)if(Y=$.get("EXT_texture_compression_bptc"),Y!==null){if(Z===36492)return K==="srgb"?Y.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:Y.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===36494)return Y.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===36495)return Y.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===36283||Z===36284||Z===36285||Z===36286)if(Y=$.get("EXT_texture_compression_rgtc"),Y!==null){if(Z===36492)return Y.COMPRESSED_RED_RGTC1_EXT;if(Z===36284)return Y.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===36285)return Y.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===36286)return Y.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===1020)return J.UNSIGNED_INT_24_8;return J[Z]!==void 0?J[Z]:null}return{convert:Q}}class K$ extends y0{constructor(J=[]){super();this.isArrayCamera=!0,this.cameras=J}}class Z0 extends F0{constructor(){super();this.isGroup=!0,this.type="Group"}}var wY={type:"move"};class r7{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new Z0,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new Z0,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new T,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new T;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new Z0,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new T,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new T;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let $=this._hand;if($)for(let Q of J.hand.values())this._getHandJoint($,Q)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,$,Q){let Z=null,W=null,Y=null,K=this._targetRay,X=this._grip,G=this._hand;if(J&&$.session.visibilityState!=="visible-blurred"){if(G&&J.hand){Y=!0;for(let A of J.hand.values()){let O=$.getJointPose(A,Q),F=this._getHandJoint(G,A);if(O!==null)F.matrix.fromArray(O.transform.matrix),F.matrix.decompose(F.position,F.rotation,F.scale),F.matrixWorldNeedsUpdate=!0,F.jointRadius=O.radius;F.visible=O!==null}let U=G.joints["index-finger-tip"],V=G.joints["thumb-tip"],H=U.position.distanceTo(V.position),q=0.02,D=0.005;if(G.inputState.pinching&&H>q+D)G.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!G.inputState.pinching&&H<=q-D)G.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(X!==null&&J.gripSpace){if(W=$.getPose(J.gripSpace,Q),W!==null){if(X.matrix.fromArray(W.transform.matrix),X.matrix.decompose(X.position,X.rotation,X.scale),X.matrixWorldNeedsUpdate=!0,W.linearVelocity)X.hasLinearVelocity=!0,X.linearVelocity.copy(W.linearVelocity);else X.hasLinearVelocity=!1;if(W.angularVelocity)X.hasAngularVelocity=!0,X.angularVelocity.copy(W.angularVelocity);else X.hasAngularVelocity=!1}}if(K!==null){if(Z=$.getPose(J.targetRaySpace,Q),Z===null&&W!==null)Z=W;if(Z!==null){if(K.matrix.fromArray(Z.transform.matrix),K.matrix.decompose(K.position,K.rotation,K.scale),K.matrixWorldNeedsUpdate=!0,Z.linearVelocity)K.hasLinearVelocity=!0,K.linearVelocity.copy(Z.linearVelocity);else K.hasLinearVelocity=!1;if(Z.angularVelocity)K.hasAngularVelocity=!0,K.angularVelocity.copy(Z.angularVelocity);else K.hasAngularVelocity=!1;this.dispatchEvent(wY)}}}if(K!==null)K.visible=Z!==null;if(X!==null)X.visible=W!==null;if(G!==null)G.visible=Y!==null;return this}_getHandJoint(J,$){if(J.joints[$.jointName]===void 0){let Q=new Z0;Q.matrixAutoUpdate=!1,Q.visible=!1,J.joints[$.jointName]=Q,J.add(Q)}return J.joints[$.jointName]}}var IY=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,TY=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class X${constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,$,Q){if(this.texture===null){let Z=new _0,W=J.properties.get(Z);if(W.__webglTexture=$.texture,$.depthNear!=Q.depthNear||$.depthFar!=Q.depthFar)this.depthNear=$.depthNear,this.depthFar=$.depthFar;this.texture=Z}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let $=J.cameras[0].viewport,Q=new Q6({vertexShader:IY,fragmentShader:TY,uniforms:{depthColor:{value:this.texture},depthWidth:{value:$.z},depthHeight:{value:$.w}}});this.mesh=new PJ(new Z6(20,20),Q)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class G$ extends P6{constructor(J,$){super();let Q=this,Z=null,W=1,Y=null,K="local-floor",X=1,G=null,U=null,V=null,H=null,q=null,D=null,A=new X$,O=$.getContextAttributes(),F=null,E=null,_=[],N=[],C=new MJ,f=null,k=new y0;k.viewport=new U0;let w=new y0;w.viewport=new U0;let b=[k,w],B=new K$,L=null,S=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(o){let JJ=_[o];if(JJ===void 0)JJ=new r7,_[o]=JJ;return JJ.getTargetRaySpace()},this.getControllerGrip=function(o){let JJ=_[o];if(JJ===void 0)JJ=new r7,_[o]=JJ;return JJ.getGripSpace()},this.getHand=function(o){let JJ=_[o];if(JJ===void 0)JJ=new r7,_[o]=JJ;return JJ.getHandSpace()};function x(o){let JJ=N.indexOf(o.inputSource);if(JJ===-1)return;let IJ=_[JJ];if(IJ!==void 0)IJ.update(o.inputSource,o.frame,G||Y),IJ.dispatchEvent({type:o.type,data:o.inputSource})}function l(){Z.removeEventListener("select",x),Z.removeEventListener("selectstart",x),Z.removeEventListener("selectend",x),Z.removeEventListener("squeeze",x),Z.removeEventListener("squeezestart",x),Z.removeEventListener("squeezeend",x),Z.removeEventListener("end",l),Z.removeEventListener("inputsourceschange",s);for(let o=0;o<_.length;o++){let JJ=N[o];if(JJ===null)continue;N[o]=null,_[o].disconnect(JJ)}L=null,S=null,A.reset(),J.setRenderTarget(F),q=null,H=null,V=null,Z=null,E=null,pJ.stop(),Q.isPresenting=!1,J.setPixelRatio(f),J.setSize(C.width,C.height,!1),Q.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(o){if(W=o,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(o){if(K=o,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return G||Y},this.setReferenceSpace=function(o){G=o},this.getBaseLayer=function(){return H!==null?H:q},this.getBinding=function(){return V},this.getFrame=function(){return D},this.getSession=function(){return Z},this.setSession=async function(o){if(Z=o,Z!==null){if(F=J.getRenderTarget(),Z.addEventListener("select",x),Z.addEventListener("selectstart",x),Z.addEventListener("selectend",x),Z.addEventListener("squeeze",x),Z.addEventListener("squeezestart",x),Z.addEventListener("squeezeend",x),Z.addEventListener("end",l),Z.addEventListener("inputsourceschange",s),O.xrCompatible!==!0)await $.makeXRCompatible();if(f=J.getPixelRatio(),J.getSize(C),Z.renderState.layers===void 0){let JJ={antialias:O.antialias,alpha:!0,depth:O.depth,stencil:O.stencil,framebufferScaleFactor:W};q=new XRWebGLLayer(Z,$,JJ),Z.updateRenderState({baseLayer:q}),J.setPixelRatio(1),J.setSize(q.framebufferWidth,q.framebufferHeight,!1),E=new N6(q.framebufferWidth,q.framebufferHeight,{format:1023,type:1009,colorSpace:J.outputColorSpace,stencilBuffer:O.stencil})}else{let JJ=null,IJ=null,SJ=null;if(O.depth)SJ=O.stencil?$.DEPTH24_STENCIL8:$.DEPTH_COMPONENT24,JJ=O.stencil?1027:1026,IJ=O.stencil?1020:1014;let I={colorFormat:$.RGBA8,depthFormat:SJ,scaleFactor:W};V=new XRWebGLBinding(Z,$),H=V.createProjectionLayer(I),Z.updateRenderState({layers:[H]}),J.setPixelRatio(1),J.setSize(H.textureWidth,H.textureHeight,!1),E=new N6(H.textureWidth,H.textureHeight,{format:1023,type:1009,depthTexture:new H9(H.textureWidth,H.textureHeight,IJ,void 0,void 0,void 0,void 0,void 0,void 0,JJ),stencilBuffer:O.stencil,colorSpace:J.outputColorSpace,samples:O.antialias?4:0,resolveDepthBuffer:H.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(X),G=null,Y=await Z.requestReferenceSpace(K),pJ.setContext(Z),pJ.start(),Q.isPresenting=!0,Q.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return A.getDepthTexture()};function s(o){for(let JJ=0;JJ<o.removed.length;JJ++){let IJ=o.removed[JJ],SJ=N.indexOf(IJ);if(SJ>=0)N[SJ]=null,_[SJ].disconnect(IJ)}for(let JJ=0;JJ<o.added.length;JJ++){let IJ=o.added[JJ],SJ=N.indexOf(IJ);if(SJ===-1){for(let FJ=0;FJ<_.length;FJ++)if(FJ>=N.length){N.push(IJ),SJ=FJ;break}else if(N[FJ]===null){N[FJ]=IJ,SJ=FJ;break}if(SJ===-1)break}let I=_[SJ];if(I)I.connect(IJ)}}let d=new T,c=new T;function e(o,JJ,IJ){d.setFromMatrixPosition(JJ.matrixWorld),c.setFromMatrixPosition(IJ.matrixWorld);let SJ=d.distanceTo(c),I=JJ.projectionMatrix.elements,FJ=IJ.projectionMatrix.elements,kJ=I[14]/(I[10]-1),BJ=I[14]/(I[10]+1),XJ=(I[9]+1)/I[5],yJ=(I[9]-1)/I[5],P=(I[8]-1)/I[0],lJ=(FJ[8]+1)/FJ[0],zJ=kJ*P,vJ=kJ*lJ,UJ=SJ/(-P+lJ),dJ=UJ*-P;if(JJ.matrixWorld.decompose(o.position,o.quaternion,o.scale),o.translateX(dJ),o.translateZ(UJ),o.matrixWorld.compose(o.position,o.quaternion,o.scale),o.matrixWorldInverse.copy(o.matrixWorld).invert(),I[10]===-1)o.projectionMatrix.copy(JJ.projectionMatrix),o.projectionMatrixInverse.copy(JJ.projectionMatrixInverse);else{let NJ=kJ+UJ,WJ=BJ+UJ,z=zJ-dJ,R=vJ+(SJ-dJ),h=XJ*BJ/WJ*NJ,i=yJ*BJ/WJ*NJ;o.projectionMatrix.makePerspective(z,R,h,i,NJ,WJ),o.projectionMatrixInverse.copy(o.projectionMatrix).invert()}}function m(o,JJ){if(JJ===null)o.matrixWorld.copy(o.matrix);else o.matrixWorld.multiplyMatrices(JJ.matrixWorld,o.matrix);o.matrixWorldInverse.copy(o.matrixWorld).invert()}this.updateCamera=function(o){if(Z===null)return;let{near:JJ,far:IJ}=o;if(A.texture!==null){if(A.depthNear>0)JJ=A.depthNear;if(A.depthFar>0)IJ=A.depthFar}if(B.near=w.near=k.near=JJ,B.far=w.far=k.far=IJ,L!==B.near||S!==B.far)Z.updateRenderState({depthNear:B.near,depthFar:B.far}),L=B.near,S=B.far;k.layers.mask=o.layers.mask|2,w.layers.mask=o.layers.mask|4,B.layers.mask=k.layers.mask|w.layers.mask;let SJ=o.parent,I=B.cameras;m(B,SJ);for(let FJ=0;FJ<I.length;FJ++)m(I[FJ],SJ);if(I.length===2)e(B,k,w);else B.projectionMatrix.copy(k.projectionMatrix);YJ(o,B,SJ)};function YJ(o,JJ,IJ){if(IJ===null)o.matrix.copy(JJ.matrixWorld);else o.matrix.copy(IJ.matrixWorld),o.matrix.invert(),o.matrix.multiply(JJ.matrixWorld);if(o.matrix.decompose(o.position,o.quaternion,o.scale),o.updateMatrixWorld(!0),o.projectionMatrix.copy(JJ.projectionMatrix),o.projectionMatrixInverse.copy(JJ.projectionMatrixInverse),o.isPerspectiveCamera)o.fov=t8*2*Math.atan(1/o.projectionMatrix.elements[5]),o.zoom=1}this.getCamera=function(){return B},this.getFoveation=function(){if(H===null&&q===null)return;return X},this.setFoveation=function(o){if(X=o,H!==null)H.fixedFoveation=o;if(q!==null&&q.fixedFoveation!==void 0)q.fixedFoveation=o},this.hasDepthSensing=function(){return A.texture!==null},this.getDepthSensingMesh=function(){return A.getMesh(B)};let GJ=null;function wJ(o,JJ){if(U=JJ.getViewerPose(G||Y),D=JJ,U!==null){let IJ=U.views;if(q!==null)J.setRenderTargetFramebuffer(E,q.framebuffer),J.setRenderTarget(E);let SJ=!1;if(IJ.length!==B.cameras.length)B.cameras.length=0,SJ=!0;for(let FJ=0;FJ<IJ.length;FJ++){let kJ=IJ[FJ],BJ=null;if(q!==null)BJ=q.getViewport(kJ);else{let yJ=V.getViewSubImage(H,kJ);if(BJ=yJ.viewport,FJ===0)J.setRenderTargetTextures(E,yJ.colorTexture,H.ignoreDepthValues?void 0:yJ.depthStencilTexture),J.setRenderTarget(E)}let XJ=b[FJ];if(XJ===void 0)XJ=new y0,XJ.layers.enable(FJ),XJ.viewport=new U0,b[FJ]=XJ;if(XJ.matrix.fromArray(kJ.transform.matrix),XJ.matrix.decompose(XJ.position,XJ.quaternion,XJ.scale),XJ.projectionMatrix.fromArray(kJ.projectionMatrix),XJ.projectionMatrixInverse.copy(XJ.projectionMatrix).invert(),XJ.viewport.set(BJ.x,BJ.y,BJ.width,BJ.height),FJ===0)B.matrix.copy(XJ.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale);if(SJ===!0)B.cameras.push(XJ)}let I=Z.enabledFeatures;if(I&&I.includes("depth-sensing")){let FJ=V.getDepthInformation(IJ[0]);if(FJ&&FJ.isValid&&FJ.texture)A.init(J,FJ,Z.renderState)}}for(let IJ=0;IJ<_.length;IJ++){let SJ=N[IJ],I=_[IJ];if(SJ!==null&&I!==void 0)I.update(SJ,JJ,G||Y)}if(GJ)GJ(o,JJ);if(JJ.detectedPlanes)Q.dispatchEvent({type:"planesdetected",data:JJ});D=null}let pJ=new o5;pJ.setAnimationLoop(wJ),this.setAnimationLoop=function(o){GJ=o},this.dispose=function(){}}}var w6=new c0,PY=new K0;function SY(J,$){function Q(F,E){if(F.matrixAutoUpdate===!0)F.updateMatrix();E.value.copy(F.matrix)}function Z(F,E){if(E.color.getRGB(F.fogColor.value,c5(J)),E.isFog)F.fogNear.value=E.near,F.fogFar.value=E.far;else if(E.isFogExp2)F.fogDensity.value=E.density}function W(F,E,_,N,C){if(E.isMeshBasicMaterial)Y(F,E);else if(E.isMeshLambertMaterial)Y(F,E);else if(E.isMeshToonMaterial)Y(F,E),H(F,E);else if(E.isMeshPhongMaterial)Y(F,E),V(F,E);else if(E.isMeshStandardMaterial){if(Y(F,E),q(F,E),E.isMeshPhysicalMaterial)D(F,E,C)}else if(E.isMeshMatcapMaterial)Y(F,E),A(F,E);else if(E.isMeshDepthMaterial)Y(F,E);else if(E.isMeshDistanceMaterial)Y(F,E),O(F,E);else if(E.isMeshNormalMaterial)Y(F,E);else if(E.isLineBasicMaterial){if(K(F,E),E.isLineDashedMaterial)X(F,E)}else if(E.isPointsMaterial)G(F,E,_,N);else if(E.isSpriteMaterial)U(F,E);else if(E.isShadowMaterial)F.color.value.copy(E.color),F.opacity.value=E.opacity;else if(E.isShaderMaterial)E.uniformsNeedUpdate=!1}function Y(F,E){if(F.opacity.value=E.opacity,E.color)F.diffuse.value.copy(E.color);if(E.emissive)F.emissive.value.copy(E.emissive).multiplyScalar(E.emissiveIntensity);if(E.map)F.map.value=E.map,Q(E.map,F.mapTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,Q(E.alphaMap,F.alphaMapTransform);if(E.bumpMap){if(F.bumpMap.value=E.bumpMap,Q(E.bumpMap,F.bumpMapTransform),F.bumpScale.value=E.bumpScale,E.side===1)F.bumpScale.value*=-1}if(E.normalMap){if(F.normalMap.value=E.normalMap,Q(E.normalMap,F.normalMapTransform),F.normalScale.value.copy(E.normalScale),E.side===1)F.normalScale.value.negate()}if(E.displacementMap)F.displacementMap.value=E.displacementMap,Q(E.displacementMap,F.displacementMapTransform),F.displacementScale.value=E.displacementScale,F.displacementBias.value=E.displacementBias;if(E.emissiveMap)F.emissiveMap.value=E.emissiveMap,Q(E.emissiveMap,F.emissiveMapTransform);if(E.specularMap)F.specularMap.value=E.specularMap,Q(E.specularMap,F.specularMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest;let _=$.get(E),N=_.envMap,C=_.envMapRotation;if(N){if(F.envMap.value=N,w6.copy(C),w6.x*=-1,w6.y*=-1,w6.z*=-1,N.isCubeTexture&&N.isRenderTargetTexture===!1)w6.y*=-1,w6.z*=-1;F.envMapRotation.value.setFromMatrix4(PY.makeRotationFromEuler(w6)),F.flipEnvMap.value=N.isCubeTexture&&N.isRenderTargetTexture===!1?-1:1,F.reflectivity.value=E.reflectivity,F.ior.value=E.ior,F.refractionRatio.value=E.refractionRatio}if(E.lightMap)F.lightMap.value=E.lightMap,F.lightMapIntensity.value=E.lightMapIntensity,Q(E.lightMap,F.lightMapTransform);if(E.aoMap)F.aoMap.value=E.aoMap,F.aoMapIntensity.value=E.aoMapIntensity,Q(E.aoMap,F.aoMapTransform)}function K(F,E){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,E.map)F.map.value=E.map,Q(E.map,F.mapTransform)}function X(F,E){F.dashSize.value=E.dashSize,F.totalSize.value=E.dashSize+E.gapSize,F.scale.value=E.scale}function G(F,E,_,N){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,F.size.value=E.size*_,F.scale.value=N*0.5,E.map)F.map.value=E.map,Q(E.map,F.uvTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,Q(E.alphaMap,F.alphaMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest}function U(F,E){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,F.rotation.value=E.rotation,E.map)F.map.value=E.map,Q(E.map,F.mapTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,Q(E.alphaMap,F.alphaMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest}function V(F,E){F.specular.value.copy(E.specular),F.shininess.value=Math.max(E.shininess,0.0001)}function H(F,E){if(E.gradientMap)F.gradientMap.value=E.gradientMap}function q(F,E){if(F.metalness.value=E.metalness,E.metalnessMap)F.metalnessMap.value=E.metalnessMap,Q(E.metalnessMap,F.metalnessMapTransform);if(F.roughness.value=E.roughness,E.roughnessMap)F.roughnessMap.value=E.roughnessMap,Q(E.roughnessMap,F.roughnessMapTransform);if(E.envMap)F.envMapIntensity.value=E.envMapIntensity}function D(F,E,_){if(F.ior.value=E.ior,E.sheen>0){if(F.sheenColor.value.copy(E.sheenColor).multiplyScalar(E.sheen),F.sheenRoughness.value=E.sheenRoughness,E.sheenColorMap)F.sheenColorMap.value=E.sheenColorMap,Q(E.sheenColorMap,F.sheenColorMapTransform);if(E.sheenRoughnessMap)F.sheenRoughnessMap.value=E.sheenRoughnessMap,Q(E.sheenRoughnessMap,F.sheenRoughnessMapTransform)}if(E.clearcoat>0){if(F.clearcoat.value=E.clearcoat,F.clearcoatRoughness.value=E.clearcoatRoughness,E.clearcoatMap)F.clearcoatMap.value=E.clearcoatMap,Q(E.clearcoatMap,F.clearcoatMapTransform);if(E.clearcoatRoughnessMap)F.clearcoatRoughnessMap.value=E.clearcoatRoughnessMap,Q(E.clearcoatRoughnessMap,F.clearcoatRoughnessMapTransform);if(E.clearcoatNormalMap){if(F.clearcoatNormalMap.value=E.clearcoatNormalMap,Q(E.clearcoatNormalMap,F.clearcoatNormalMapTransform),F.clearcoatNormalScale.value.copy(E.clearcoatNormalScale),E.side===1)F.clearcoatNormalScale.value.negate()}}if(E.dispersion>0)F.dispersion.value=E.dispersion;if(E.iridescence>0){if(F.iridescence.value=E.iridescence,F.iridescenceIOR.value=E.iridescenceIOR,F.iridescenceThicknessMinimum.value=E.iridescenceThicknessRange[0],F.iridescenceThicknessMaximum.value=E.iridescenceThicknessRange[1],E.iridescenceMap)F.iridescenceMap.value=E.iridescenceMap,Q(E.iridescenceMap,F.iridescenceMapTransform);if(E.iridescenceThicknessMap)F.iridescenceThicknessMap.value=E.iridescenceThicknessMap,Q(E.iridescenceThicknessMap,F.iridescenceThicknessMapTransform)}if(E.transmission>0){if(F.transmission.value=E.transmission,F.transmissionSamplerMap.value=_.texture,F.transmissionSamplerSize.value.set(_.width,_.height),E.transmissionMap)F.transmissionMap.value=E.transmissionMap,Q(E.transmissionMap,F.transmissionMapTransform);if(F.thickness.value=E.thickness,E.thicknessMap)F.thicknessMap.value=E.thicknessMap,Q(E.thicknessMap,F.thicknessMapTransform);F.attenuationDistance.value=E.attenuationDistance,F.attenuationColor.value.copy(E.attenuationColor)}if(E.anisotropy>0){if(F.anisotropyVector.value.set(E.anisotropy*Math.cos(E.anisotropyRotation),E.anisotropy*Math.sin(E.anisotropyRotation)),E.anisotropyMap)F.anisotropyMap.value=E.anisotropyMap,Q(E.anisotropyMap,F.anisotropyMapTransform)}if(F.specularIntensity.value=E.specularIntensity,F.specularColor.value.copy(E.specularColor),E.specularColorMap)F.specularColorMap.value=E.specularColorMap,Q(E.specularColorMap,F.specularColorMapTransform);if(E.specularIntensityMap)F.specularIntensityMap.value=E.specularIntensityMap,Q(E.specularIntensityMap,F.specularIntensityMapTransform)}function A(F,E){if(E.matcap)F.matcap.value=E.matcap}function O(F,E){let _=$.get(E).light;F.referencePosition.value.setFromMatrixPosition(_.matrixWorld),F.nearDistance.value=_.shadow.camera.near,F.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:W}}function yY(J,$,Q,Z){let W={},Y={},K=[],X=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function G(_,N){let C=N.program;Z.uniformBlockBinding(_,C)}function U(_,N){let C=W[_.id];if(C===void 0)A(_),C=V(_),W[_.id]=C,_.addEventListener("dispose",F);let f=N.program;Z.updateUBOMapping(_,f);let k=$.render.frame;if(Y[_.id]!==k)q(_),Y[_.id]=k}function V(_){let N=H();_.__bindingPointIndex=N;let C=J.createBuffer(),f=_.__size,k=_.usage;return J.bindBuffer(J.UNIFORM_BUFFER,C),J.bufferData(J.UNIFORM_BUFFER,f,k),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,N,C),C}function H(){for(let _=0;_<X;_++)if(K.indexOf(_)===-1)return K.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function q(_){let N=W[_.id],C=_.uniforms,f=_.__cache;J.bindBuffer(J.UNIFORM_BUFFER,N);for(let k=0,w=C.length;k<w;k++){let b=Array.isArray(C[k])?C[k]:[C[k]];for(let B=0,L=b.length;B<L;B++){let S=b[B];if(D(S,k,B,f)===!0){let x=S.__offset,l=Array.isArray(S.value)?S.value:[S.value],s=0;for(let d=0;d<l.length;d++){let c=l[d],e=O(c);if(typeof c==="number"||typeof c==="boolean")S.__data[0]=c,J.bufferSubData(J.UNIFORM_BUFFER,x+s,S.__data);else if(c.isMatrix3)S.__data[0]=c.elements[0],S.__data[1]=c.elements[1],S.__data[2]=c.elements[2],S.__data[3]=0,S.__data[4]=c.elements[3],S.__data[5]=c.elements[4],S.__data[6]=c.elements[5],S.__data[7]=0,S.__data[8]=c.elements[6],S.__data[9]=c.elements[7],S.__data[10]=c.elements[8],S.__data[11]=0;else c.toArray(S.__data,s),s+=e.storage/Float32Array.BYTES_PER_ELEMENT}J.bufferSubData(J.UNIFORM_BUFFER,x,S.__data)}}}J.bindBuffer(J.UNIFORM_BUFFER,null)}function D(_,N,C,f){let k=_.value,w=N+"_"+C;if(f[w]===void 0){if(typeof k==="number"||typeof k==="boolean")f[w]=k;else f[w]=k.clone();return!0}else{let b=f[w];if(typeof k==="number"||typeof k==="boolean"){if(b!==k)return f[w]=k,!0}else if(b.equals(k)===!1)return b.copy(k),!0}return!1}function A(_){let N=_.uniforms,C=0,f=16;for(let w=0,b=N.length;w<b;w++){let B=Array.isArray(N[w])?N[w]:[N[w]];for(let L=0,S=B.length;L<S;L++){let x=B[L],l=Array.isArray(x.value)?x.value:[x.value];for(let s=0,d=l.length;s<d;s++){let c=l[s],e=O(c),m=C%f,YJ=m%e.boundary,GJ=m+YJ;if(C+=YJ,GJ!==0&&f-GJ<e.storage)C+=f-GJ;x.__data=new Float32Array(e.storage/Float32Array.BYTES_PER_ELEMENT),x.__offset=C,C+=e.storage}}}let k=C%f;if(k>0)C+=f-k;return _.__size=C,_.__cache={},this}function O(_){let N={boundary:0,storage:0};if(typeof _==="number"||typeof _==="boolean")N.boundary=4,N.storage=4;else if(_.isVector2)N.boundary=8,N.storage=8;else if(_.isVector3||_.isColor)N.boundary=16,N.storage=12;else if(_.isVector4)N.boundary=16,N.storage=16;else if(_.isMatrix3)N.boundary=48,N.storage=48;else if(_.isMatrix4)N.boundary=64,N.storage=64;else if(_.isTexture)console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.");else console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_);return N}function F(_){let N=_.target;N.removeEventListener("dispose",F);let C=K.indexOf(N.__bindingPointIndex);K.splice(C,1),J.deleteBuffer(W[N.id]),delete W[N.id],delete Y[N.id]}function E(){for(let _ in W)J.deleteBuffer(W[_]);K=[],W={},Y={}}return{bind:G,update:U,dispose:E}}class V9{constructor(J={}){let{canvas:$=h$(),context:Q=null,depth:Z=!0,stencil:W=!1,alpha:Y=!1,antialias:K=!1,premultipliedAlpha:X=!0,preserveDrawingBuffer:G=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:V=!1,reverseDepthBuffer:H=!1}=J;this.isWebGLRenderer=!0;let q;if(Q!==null){if(typeof WebGLRenderingContext<"u"&&Q instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");q=Q.getContextAttributes().alpha}else q=Y;let D=new Uint32Array(4),A=new Int32Array(4),O=null,F=null,E=[],_=[];this.domElement=$,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace="srgb",this.toneMapping=0,this.toneMappingExposure=1;let N=this,C=!1,f=0,k=0,w=null,b=-1,B=null,L=new U0,S=new U0,x=null,l=new nJ(0),s=0,d=$.width,c=$.height,e=1,m=null,YJ=null,GJ=new U0(0,0,d,c),wJ=new U0(0,0,d,c),pJ=!1,o=new Z8,JJ=!1,IJ=!1,SJ=new K0,I=new K0,FJ=new T,kJ=new U0,BJ={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},XJ=!1;function yJ(){return w===null?e:1}let P=Q;function lJ(M,j){return $.getContext(M,j)}try{let M={alpha:!0,depth:Z,stencil:W,antialias:K,premultipliedAlpha:X,preserveDrawingBuffer:G,powerPreference:U,failIfMajorPerformanceCaveat:V};if("setAttribute"in $)$.setAttribute("data-engine","three.js r170");if($.addEventListener("webglcontextlost",a,!1),$.addEventListener("webglcontextrestored",r,!1),$.addEventListener("webglcontextcreationerror",EJ,!1),P===null){if(P=lJ("webgl2",M),P===null)if(lJ("webgl2"))throw Error("Error creating WebGL context with your selected attributes.");else throw Error("Error creating WebGL context.")}}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let zJ,vJ,UJ,dJ,NJ,WJ,z,R,h,i,t,u,TJ,HJ,RJ,hJ,QJ,DJ,sJ,jJ,OJ,bJ,cJ,X0;function y(){if(zJ=new o4(P),zJ.init(),bJ=new CY(P,zJ),vJ=new u4(P,zJ,J,bJ),UJ=new _Y(P,zJ),vJ.reverseDepthBuffer&&H)UJ.buffers.depth.setReversed(!0);dJ=new r4(P),NJ=new HY,WJ=new kY(P,zJ,UJ,NJ,vJ,bJ,dJ),z=new d4(N),R=new s4(N),h=new WQ(P),cJ=new p4(P,h),i=new i4(P,h,dJ,cJ),t=new e4(P,i,h,dJ),sJ=new t4(P,vJ,WJ),hJ=new l4(NJ),u=new UY(N,z,R,zJ,vJ,cJ,hJ),TJ=new SY(N,NJ),HJ=new qY,RJ=new OY(zJ),DJ=new g4(N,z,R,UJ,t,q,X),QJ=new AY(N,t,vJ),X0=new yY(P,dJ,vJ,UJ),jJ=new m4(P,zJ,dJ),OJ=new a4(P,zJ,dJ),dJ.programs=u.programs,N.capabilities=vJ,N.extensions=zJ,N.properties=NJ,N.renderLists=HJ,N.shadowMap=QJ,N.state=UJ,N.info=dJ}y();let $J=new G$(N,P);this.xr=$J,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){let M=zJ.get("WEBGL_lose_context");if(M)M.loseContext()},this.forceContextRestore=function(){let M=zJ.get("WEBGL_lose_context");if(M)M.restoreContext()},this.getPixelRatio=function(){return e},this.setPixelRatio=function(M){if(M===void 0)return;e=M,this.setSize(d,c,!1)},this.getSize=function(M){return M.set(d,c)},this.setSize=function(M,j,g=!0){if($J.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}if(d=M,c=j,$.width=Math.floor(M*e),$.height=Math.floor(j*e),g===!0)$.style.width=M+"px",$.style.height=j+"px";this.setViewport(0,0,M,j)},this.getDrawingBufferSize=function(M){return M.set(d*e,c*e).floor()},this.setDrawingBufferSize=function(M,j,g){d=M,c=j,e=g,$.width=Math.floor(M*g),$.height=Math.floor(j*g),this.setViewport(0,0,M,j)},this.getCurrentViewport=function(M){return M.copy(L)},this.getViewport=function(M){return M.copy(GJ)},this.setViewport=function(M,j,g,p){if(M.isVector4)GJ.set(M.x,M.y,M.z,M.w);else GJ.set(M,j,g,p);UJ.viewport(L.copy(GJ).multiplyScalar(e).round())},this.getScissor=function(M){return M.copy(wJ)},this.setScissor=function(M,j,g,p){if(M.isVector4)wJ.set(M.x,M.y,M.z,M.w);else wJ.set(M,j,g,p);UJ.scissor(S.copy(wJ).multiplyScalar(e).round())},this.getScissorTest=function(){return pJ},this.setScissorTest=function(M){UJ.setScissorTest(pJ=M)},this.setOpaqueSort=function(M){m=M},this.setTransparentSort=function(M){YJ=M},this.getClearColor=function(M){return M.copy(DJ.getClearColor())},this.setClearColor=function(){DJ.setClearColor.apply(DJ,arguments)},this.getClearAlpha=function(){return DJ.getClearAlpha()},this.setClearAlpha=function(){DJ.setClearAlpha.apply(DJ,arguments)},this.clear=function(M=!0,j=!0,g=!0){let p=0;if(M){let v=!1;if(w!==null){let ZJ=w.texture.format;v=ZJ===1033||ZJ===1031||ZJ===1029}if(v){let ZJ=w.texture.type,qJ=ZJ===1009||ZJ===1014||ZJ===1012||ZJ===1020||ZJ===1017||ZJ===1018,AJ=DJ.getClearColor(),LJ=DJ.getClearAlpha(),fJ=AJ.r,xJ=AJ.g,_J=AJ.b;if(qJ)D[0]=fJ,D[1]=xJ,D[2]=_J,D[3]=LJ,P.clearBufferuiv(P.COLOR,0,D);else A[0]=fJ,A[1]=xJ,A[2]=_J,A[3]=LJ,P.clearBufferiv(P.COLOR,0,A)}else p|=P.COLOR_BUFFER_BIT}if(j)p|=P.DEPTH_BUFFER_BIT;if(g)p|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);P.clear(p)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){$.removeEventListener("webglcontextlost",a,!1),$.removeEventListener("webglcontextrestored",r,!1),$.removeEventListener("webglcontextcreationerror",EJ,!1),HJ.dispose(),RJ.dispose(),NJ.dispose(),z.dispose(),R.dispose(),t.dispose(),cJ.dispose(),X0.dispose(),u.dispose(),$J.dispose(),$J.removeEventListener("sessionstart",m0),$J.removeEventListener("sessionend",T9),A6.stop()};function a(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),C=!0}function r(){console.log("THREE.WebGLRenderer: Context Restored."),C=!1;let M=dJ.autoReset,j=QJ.enabled,g=QJ.autoUpdate,p=QJ.needsUpdate,v=QJ.type;y(),dJ.autoReset=M,QJ.enabled=j,QJ.autoUpdate=g,QJ.needsUpdate=p,QJ.type=v}function EJ(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function VJ(M){let j=M.target;j.removeEventListener("dispose",VJ),mJ(j)}function mJ(M){G0(M),NJ.remove(M)}function G0(M){let j=NJ.get(M).programs;if(j!==void 0){if(j.forEach(function(g){u.releaseProgram(g)}),M.isShaderMaterial)u.releaseShaderCache(M)}}this.renderBufferDirect=function(M,j,g,p,v,ZJ){if(j===null)j=BJ;let qJ=v.isMesh&&v.matrixWorld.determinant()<0,AJ=y$(M,j,g,p,v);UJ.setMaterial(p,qJ);let LJ=g.index,fJ=1;if(p.wireframe===!0){if(LJ=i.getWireframeAttribute(g),LJ===void 0)return;fJ=2}let xJ=g.drawRange,_J=g.attributes.position,iJ=xJ.start*fJ,Q0=(xJ.start+xJ.count)*fJ;if(ZJ!==null)iJ=Math.max(iJ,ZJ.start*fJ),Q0=Math.min(Q0,(ZJ.start+ZJ.count)*fJ);if(LJ!==null)iJ=Math.max(iJ,0),Q0=Math.min(Q0,LJ.count);else if(_J!==void 0&&_J!==null)iJ=Math.max(iJ,0),Q0=Math.min(Q0,_J.count);let W0=Q0-iJ;if(W0<0||W0===1/0)return;cJ.setup(v,p,AJ,g,LJ);let k0,rJ=jJ;if(LJ!==null)k0=h.get(LJ),rJ=OJ,rJ.setIndex(k0);if(v.isMesh)if(p.wireframe===!0)UJ.setLineWidth(p.wireframeLinewidth*yJ()),rJ.setMode(P.LINES);else rJ.setMode(P.TRIANGLES);else if(v.isLine){let CJ=p.linewidth;if(CJ===void 0)CJ=1;if(UJ.setLineWidth(CJ*yJ()),v.isLineSegments)rJ.setMode(P.LINES);else if(v.isLineLoop)rJ.setMode(P.LINE_LOOP);else rJ.setMode(P.LINE_STRIP)}else if(v.isPoints)rJ.setMode(P.POINTS);else if(v.isSprite)rJ.setMode(P.TRIANGLES);if(v.isBatchedMesh)if(v._multiDrawInstances!==null)rJ.renderMultiDrawInstances(v._multiDrawStarts,v._multiDrawCounts,v._multiDrawCount,v._multiDrawInstances);else if(!zJ.get("WEBGL_multi_draw")){let{_multiDrawStarts:CJ,_multiDrawCounts:i0,_multiDrawCount:tJ}=v,f0=LJ?h.get(LJ).bytesPerElement:1,j6=NJ.get(p).currentProgram.getUniforms();for(let C0=0;C0<tJ;C0++)j6.setValue(P,"_gl_DrawID",C0),rJ.render(CJ[C0]/f0,i0[C0])}else rJ.renderMultiDraw(v._multiDrawStarts,v._multiDrawCounts,v._multiDrawCount);else if(v.isInstancedMesh)rJ.renderInstances(iJ,W0,v.count);else if(g.isInstancedBufferGeometry){let CJ=g._maxInstanceCount!==void 0?g._maxInstanceCount:1/0,i0=Math.min(g.instanceCount,CJ);rJ.renderInstances(iJ,W0,i0)}else rJ.render(iJ,W0)};function D0(M,j,g){if(M.transparent===!0&&M.side===2&&M.forceSinglePass===!1)M.side=1,M.needsUpdate=!0,k7(M,j,g),M.side=0,M.needsUpdate=!0,k7(M,j,g),M.side=2;else k7(M,j,g)}this.compile=function(M,j,g=null){if(g===null)g=M;if(F=RJ.get(g),F.init(j),_.push(F),g.traverseVisible(function(v){if(v.isLight&&v.layers.test(j.layers)){if(F.pushLight(v),v.castShadow)F.pushShadow(v)}}),M!==g)M.traverseVisible(function(v){if(v.isLight&&v.layers.test(j.layers)){if(F.pushLight(v),v.castShadow)F.pushShadow(v)}});F.setupLights();let p=new Set;return M.traverse(function(v){if(!(v.isMesh||v.isPoints||v.isLine||v.isSprite))return;let ZJ=v.material;if(ZJ)if(Array.isArray(ZJ))for(let qJ=0;qJ<ZJ.length;qJ++){let AJ=ZJ[qJ];D0(AJ,g,v),p.add(AJ)}else D0(ZJ,g,v),p.add(ZJ)}),_.pop(),F=null,p},this.compileAsync=function(M,j,g=null){let p=this.compile(M,j,g);return new Promise((v)=>{function ZJ(){if(p.forEach(function(qJ){if(NJ.get(qJ).currentProgram.isReady())p.delete(qJ)}),p.size===0){v(M);return}setTimeout(ZJ,10)}if(zJ.get("KHR_parallel_shader_compile")!==null)ZJ();else setTimeout(ZJ,10)})};let aJ=null;function o0(M){if(aJ)aJ(M)}function m0(){A6.stop()}function T9(){A6.start()}let A6=new o5;if(A6.setAnimationLoop(o0),typeof self<"u")A6.setContext(self);this.setAnimationLoop=function(M){aJ=M,$J.setAnimationLoop(M),M===null?A6.stop():A6.start()},$J.addEventListener("sessionstart",m0),$J.addEventListener("sessionend",T9),this.render=function(M,j){if(j!==void 0&&j.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;if(M.matrixWorldAutoUpdate===!0)M.updateMatrixWorld();if(j.parent===null&&j.matrixWorldAutoUpdate===!0)j.updateMatrixWorld();if($J.enabled===!0&&$J.isPresenting===!0){if($J.cameraAutoUpdate===!0)$J.updateCamera(j);j=$J.getCamera()}if(M.isScene===!0)M.onBeforeRender(N,M,j,w);if(F=RJ.get(M,_.length),F.init(j),_.push(F),I.multiplyMatrices(j.projectionMatrix,j.matrixWorldInverse),o.setFromProjectionMatrix(I),IJ=this.localClippingEnabled,JJ=hJ.init(this.clippingPlanes,IJ),O=HJ.get(M,E.length),O.init(),E.push(O),$J.enabled===!0&&$J.isPresenting===!0){let ZJ=N.xr.getDepthSensingMesh();if(ZJ!==null)O8(ZJ,j,-1/0,N.sortObjects)}if(O8(M,j,0,N.sortObjects),O.finish(),N.sortObjects===!0)O.sort(m,YJ);if(XJ=$J.enabled===!1||$J.isPresenting===!1||$J.hasDepthSensing()===!1,XJ)DJ.addToRenderList(O,M);if(this.info.render.frame++,JJ===!0)hJ.beginShadows();let g=F.state.shadowsArray;if(QJ.render(g,M,j),JJ===!0)hJ.endShadows();if(this.info.autoReset===!0)this.info.reset();let{opaque:p,transmissive:v}=O;if(F.setupLights(),j.isArrayCamera){let ZJ=j.cameras;if(v.length>0)for(let qJ=0,AJ=ZJ.length;qJ<AJ;qJ++){let LJ=ZJ[qJ];S9(p,v,M,LJ)}if(XJ)DJ.render(M);for(let qJ=0,AJ=ZJ.length;qJ<AJ;qJ++){let LJ=ZJ[qJ];P9(O,M,LJ,LJ.viewport)}}else{if(v.length>0)S9(p,v,M,j);if(XJ)DJ.render(M);P9(O,M,j)}if(w!==null)WJ.updateMultisampleRenderTarget(w),WJ.updateRenderTargetMipmap(w);if(M.isScene===!0)M.onAfterRender(N,M,j);if(cJ.resetDefaultState(),b=-1,B=null,_.pop(),_.length>0){if(F=_[_.length-1],JJ===!0)hJ.setGlobalState(N.clippingPlanes,F.state.camera)}else F=null;if(E.pop(),E.length>0)O=E[E.length-1];else O=null};function O8(M,j,g,p){if(M.visible===!1)return;if(M.layers.test(j.layers)){if(M.isGroup)g=M.renderOrder;else if(M.isLOD){if(M.autoUpdate===!0)M.update(j)}else if(M.isLight){if(F.pushLight(M),M.castShadow)F.pushShadow(M)}else if(M.isSprite){if(!M.frustumCulled||o.intersectsSprite(M)){if(p)kJ.setFromMatrixPosition(M.matrixWorld).applyMatrix4(I);let qJ=t.update(M),AJ=M.material;if(AJ.visible)O.push(M,qJ,AJ,g,kJ.z,null)}}else if(M.isMesh||M.isLine||M.isPoints){if(!M.frustumCulled||o.intersectsObject(M)){let qJ=t.update(M),AJ=M.material;if(p){if(M.boundingSphere!==void 0){if(M.boundingSphere===null)M.computeBoundingSphere();kJ.copy(M.boundingSphere.center)}else{if(qJ.boundingSphere===null)qJ.computeBoundingSphere();kJ.copy(qJ.boundingSphere.center)}kJ.applyMatrix4(M.matrixWorld).applyMatrix4(I)}if(Array.isArray(AJ)){let LJ=qJ.groups;for(let fJ=0,xJ=LJ.length;fJ<xJ;fJ++){let _J=LJ[fJ],iJ=AJ[_J.materialIndex];if(iJ&&iJ.visible)O.push(M,qJ,iJ,g,kJ.z,_J)}}else if(AJ.visible)O.push(M,qJ,AJ,g,kJ.z,null)}}}let ZJ=M.children;for(let qJ=0,AJ=ZJ.length;qJ<AJ;qJ++)O8(ZJ[qJ],j,g,p)}function P9(M,j,g,p){let{opaque:v,transmissive:ZJ,transparent:qJ}=M;if(F.setupLightsView(g),JJ===!0)hJ.setGlobalState(N.clippingPlanes,g);if(p)UJ.viewport(L.copy(p));if(v.length>0)z7(v,j,g);if(ZJ.length>0)z7(ZJ,j,g);if(qJ.length>0)z7(qJ,j,g);UJ.buffers.depth.setTest(!0),UJ.buffers.depth.setMask(!0),UJ.buffers.color.setMask(!0),UJ.setPolygonOffset(!1)}function S9(M,j,g,p){if((g.isScene===!0?g.overrideMaterial:null)!==null)return;if(F.state.transmissionRenderTarget[p.id]===void 0)F.state.transmissionRenderTarget[p.id]=new N6(1,1,{generateMipmaps:!0,type:zJ.has("EXT_color_buffer_half_float")||zJ.has("EXT_color_buffer_float")?1016:1009,minFilter:1008,samples:4,stencilBuffer:W,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:oJ.workingColorSpace});let ZJ=F.state.transmissionRenderTarget[p.id],qJ=p.viewport||L;ZJ.setSize(qJ.z,qJ.w);let AJ=N.getRenderTarget();if(N.setRenderTarget(ZJ),N.getClearColor(l),s=N.getClearAlpha(),s<1)N.setClearColor(16777215,0.5);if(N.clear(),XJ)DJ.render(g);let LJ=N.toneMapping;N.toneMapping=0;let fJ=p.viewport;if(p.viewport!==void 0)p.viewport=void 0;if(F.setupLightsView(p),JJ===!0)hJ.setGlobalState(N.clippingPlanes,p);if(z7(M,g,p),WJ.updateMultisampleRenderTarget(ZJ),WJ.updateRenderTargetMipmap(ZJ),zJ.has("WEBGL_multisampled_render_to_texture")===!1){let xJ=!1;for(let _J=0,iJ=j.length;_J<iJ;_J++){let Q0=j[_J],W0=Q0.object,k0=Q0.geometry,rJ=Q0.material,CJ=Q0.group;if(rJ.side===2&&W0.layers.test(p.layers)){let i0=rJ.side;rJ.side=1,rJ.needsUpdate=!0,y9(W0,g,p,k0,rJ,CJ),rJ.side=i0,rJ.needsUpdate=!0,xJ=!0}}if(xJ===!0)WJ.updateMultisampleRenderTarget(ZJ),WJ.updateRenderTargetMipmap(ZJ)}if(N.setRenderTarget(AJ),N.setClearColor(l,s),fJ!==void 0)p.viewport=fJ;N.toneMapping=LJ}function z7(M,j,g){let p=j.isScene===!0?j.overrideMaterial:null;for(let v=0,ZJ=M.length;v<ZJ;v++){let qJ=M[v],AJ=qJ.object,LJ=qJ.geometry,fJ=p===null?qJ.material:p,xJ=qJ.group;if(AJ.layers.test(g.layers))y9(AJ,j,g,LJ,fJ,xJ)}}function y9(M,j,g,p,v,ZJ){if(M.onBeforeRender(N,j,g,p,v,ZJ),M.modelViewMatrix.multiplyMatrices(g.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),v.onBeforeRender(N,j,g,p,M,ZJ),v.transparent===!0&&v.side===2&&v.forceSinglePass===!1)v.side=1,v.needsUpdate=!0,N.renderBufferDirect(g,j,p,v,M,ZJ),v.side=0,v.needsUpdate=!0,N.renderBufferDirect(g,j,p,v,M,ZJ),v.side=2;else N.renderBufferDirect(g,j,p,v,M,ZJ);M.onAfterRender(N,j,g,p,v,ZJ)}function k7(M,j,g){if(j.isScene!==!0)j=BJ;let p=NJ.get(M),v=F.state.lights,ZJ=F.state.shadowsArray,qJ=v.state.version,AJ=u.getParameters(M,v.state,ZJ,j,g),LJ=u.getProgramCacheKey(AJ),fJ=p.programs;if(p.environment=M.isMeshStandardMaterial?j.environment:null,p.fog=j.fog,p.envMap=(M.isMeshStandardMaterial?R:z).get(M.envMap||p.environment),p.envMapRotation=p.environment!==null&&M.envMap===null?j.environmentRotation:M.envMapRotation,fJ===void 0)M.addEventListener("dispose",VJ),fJ=new Map,p.programs=fJ;let xJ=fJ.get(LJ);if(xJ!==void 0){if(p.currentProgram===xJ&&p.lightsStateVersion===qJ)return j9(M,AJ),xJ}else AJ.uniforms=u.getUniforms(M),M.onBeforeCompile(AJ,N),xJ=u.acquireProgram(AJ,LJ),fJ.set(LJ,xJ),p.uniforms=AJ.uniforms;let _J=p.uniforms;if(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)_J.clippingPlanes=hJ.uniform;if(j9(M,AJ),p.needsLights=j$(M),p.lightsStateVersion=qJ,p.needsLights)_J.ambientLightColor.value=v.state.ambient,_J.lightProbe.value=v.state.probe,_J.directionalLights.value=v.state.directional,_J.directionalLightShadows.value=v.state.directionalShadow,_J.spotLights.value=v.state.spot,_J.spotLightShadows.value=v.state.spotShadow,_J.rectAreaLights.value=v.state.rectArea,_J.ltc_1.value=v.state.rectAreaLTC1,_J.ltc_2.value=v.state.rectAreaLTC2,_J.pointLights.value=v.state.point,_J.pointLightShadows.value=v.state.pointShadow,_J.hemisphereLights.value=v.state.hemi,_J.directionalShadowMap.value=v.state.directionalShadowMap,_J.directionalShadowMatrix.value=v.state.directionalShadowMatrix,_J.spotShadowMap.value=v.state.spotShadowMap,_J.spotLightMatrix.value=v.state.spotLightMatrix,_J.spotLightMap.value=v.state.spotLightMap,_J.pointShadowMap.value=v.state.pointShadowMap,_J.pointShadowMatrix.value=v.state.pointShadowMatrix;return p.currentProgram=xJ,p.uniformsList=null,xJ}function v9(M){if(M.uniformsList===null){let j=M.currentProgram.getUniforms();M.uniformsList=M7.seqWithValue(j.seq,M.uniforms)}return M.uniformsList}function j9(M,j){let g=NJ.get(M);g.outputColorSpace=j.outputColorSpace,g.batching=j.batching,g.batchingColor=j.batchingColor,g.instancing=j.instancing,g.instancingColor=j.instancingColor,g.instancingMorph=j.instancingMorph,g.skinning=j.skinning,g.morphTargets=j.morphTargets,g.morphNormals=j.morphNormals,g.morphColors=j.morphColors,g.morphTargetsCount=j.morphTargetsCount,g.numClippingPlanes=j.numClippingPlanes,g.numIntersection=j.numClipIntersection,g.vertexAlphas=j.vertexAlphas,g.vertexTangents=j.vertexTangents,g.toneMapping=j.toneMapping}function y$(M,j,g,p,v){if(j.isScene!==!0)j=BJ;WJ.resetTextureUnits();let ZJ=j.fog,qJ=p.isMeshStandardMaterial?j.environment:null,AJ=w===null?N.outputColorSpace:w.isXRRenderTarget===!0?w.texture.colorSpace:"srgb-linear",LJ=(p.isMeshStandardMaterial?R:z).get(p.envMap||qJ),fJ=p.vertexColors===!0&&!!g.attributes.color&&g.attributes.color.itemSize===4,xJ=!!g.attributes.tangent&&(!!p.normalMap||p.anisotropy>0),_J=!!g.morphAttributes.position,iJ=!!g.morphAttributes.normal,Q0=!!g.morphAttributes.color,W0=0;if(p.toneMapped){if(w===null||w.isXRRenderTarget===!0)W0=N.toneMapping}let k0=g.morphAttributes.position||g.morphAttributes.normal||g.morphAttributes.color,rJ=k0!==void 0?k0.length:0,CJ=NJ.get(p),i0=F.state.lights;if(JJ===!0){if(IJ===!0||M!==B){let P0=M===B&&p.id===b;hJ.setState(p,M,P0)}}let tJ=!1;if(p.version===CJ.__version){if(CJ.needsLights&&CJ.lightsStateVersion!==i0.state.version)tJ=!0;else if(CJ.outputColorSpace!==AJ)tJ=!0;else if(v.isBatchedMesh&&CJ.batching===!1)tJ=!0;else if(!v.isBatchedMesh&&CJ.batching===!0)tJ=!0;else if(v.isBatchedMesh&&CJ.batchingColor===!0&&v.colorTexture===null)tJ=!0;else if(v.isBatchedMesh&&CJ.batchingColor===!1&&v.colorTexture!==null)tJ=!0;else if(v.isInstancedMesh&&CJ.instancing===!1)tJ=!0;else if(!v.isInstancedMesh&&CJ.instancing===!0)tJ=!0;else if(v.isSkinnedMesh&&CJ.skinning===!1)tJ=!0;else if(!v.isSkinnedMesh&&CJ.skinning===!0)tJ=!0;else if(v.isInstancedMesh&&CJ.instancingColor===!0&&v.instanceColor===null)tJ=!0;else if(v.isInstancedMesh&&CJ.instancingColor===!1&&v.instanceColor!==null)tJ=!0;else if(v.isInstancedMesh&&CJ.instancingMorph===!0&&v.morphTexture===null)tJ=!0;else if(v.isInstancedMesh&&CJ.instancingMorph===!1&&v.morphTexture!==null)tJ=!0;else if(CJ.envMap!==LJ)tJ=!0;else if(p.fog===!0&&CJ.fog!==ZJ)tJ=!0;else if(CJ.numClippingPlanes!==void 0&&(CJ.numClippingPlanes!==hJ.numPlanes||CJ.numIntersection!==hJ.numIntersection))tJ=!0;else if(CJ.vertexAlphas!==fJ)tJ=!0;else if(CJ.vertexTangents!==xJ)tJ=!0;else if(CJ.morphTargets!==_J)tJ=!0;else if(CJ.morphNormals!==iJ)tJ=!0;else if(CJ.morphColors!==Q0)tJ=!0;else if(CJ.toneMapping!==W0)tJ=!0;else if(CJ.morphTargetsCount!==rJ)tJ=!0}else tJ=!0,CJ.__version=p.version;let f0=CJ.currentProgram;if(tJ===!0)f0=k7(p,j,v);let j6=!1,C0=!1,G7=!1,Y0=f0.getUniforms(),u0=CJ.uniforms;if(UJ.useProgram(f0.program))j6=!0,C0=!0,G7=!0;if(p.id!==b)b=p.id,C0=!0;if(j6||B!==M){if(UJ.buffers.depth.getReversed())SJ.copy(M.projectionMatrix),x$(SJ),g$(SJ),Y0.setValue(P,"projectionMatrix",SJ);else Y0.setValue(P,"projectionMatrix",M.projectionMatrix);Y0.setValue(P,"viewMatrix",M.matrixWorldInverse);let X6=Y0.map.cameraPosition;if(X6!==void 0)X6.setValue(P,FJ.setFromMatrixPosition(M.matrixWorld));if(vJ.logarithmicDepthBuffer)Y0.setValue(P,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2));if(p.isMeshPhongMaterial||p.isMeshToonMaterial||p.isMeshLambertMaterial||p.isMeshBasicMaterial||p.isMeshStandardMaterial||p.isShaderMaterial)Y0.setValue(P,"isOrthographic",M.isOrthographicCamera===!0);if(B!==M)B=M,C0=!0,G7=!0}if(v.isSkinnedMesh){Y0.setOptional(P,v,"bindMatrix"),Y0.setOptional(P,v,"bindMatrixInverse");let P0=v.skeleton;if(P0){if(P0.boneTexture===null)P0.computeBoneTexture();Y0.setValue(P,"boneTexture",P0.boneTexture,WJ)}}if(v.isBatchedMesh){if(Y0.setOptional(P,v,"batchingTexture"),Y0.setValue(P,"batchingTexture",v._matricesTexture,WJ),Y0.setOptional(P,v,"batchingIdTexture"),Y0.setValue(P,"batchingIdTexture",v._indirectTexture,WJ),Y0.setOptional(P,v,"batchingColorTexture"),v._colorsTexture!==null)Y0.setValue(P,"batchingColorTexture",v._colorsTexture,WJ)}let U7=g.morphAttributes;if(U7.position!==void 0||U7.normal!==void 0||U7.color!==void 0)sJ.update(v,g,f0);if(C0||CJ.receiveShadow!==v.receiveShadow)CJ.receiveShadow=v.receiveShadow,Y0.setValue(P,"receiveShadow",v.receiveShadow);if(p.isMeshGouraudMaterial&&p.envMap!==null)u0.envMap.value=LJ,u0.flipEnvMap.value=LJ.isCubeTexture&&LJ.isRenderTargetTexture===!1?-1:1;if(p.isMeshStandardMaterial&&p.envMap===null&&j.environment!==null)u0.envMapIntensity.value=j.environmentIntensity;if(C0){if(Y0.setValue(P,"toneMappingExposure",N.toneMappingExposure),CJ.needsLights)v$(u0,G7);if(ZJ&&p.fog===!0)TJ.refreshFogUniforms(u0,ZJ);TJ.refreshMaterialUniforms(u0,p,e,c,F.state.transmissionRenderTarget[M.id]),M7.upload(P,v9(CJ),u0,WJ)}if(p.isShaderMaterial&&p.uniformsNeedUpdate===!0)M7.upload(P,v9(CJ),u0,WJ),p.uniformsNeedUpdate=!1;if(p.isSpriteMaterial)Y0.setValue(P,"center",v.center);if(Y0.setValue(P,"modelViewMatrix",v.modelViewMatrix),Y0.setValue(P,"normalMatrix",v.normalMatrix),Y0.setValue(P,"modelMatrix",v.matrixWorld),p.isShaderMaterial||p.isRawShaderMaterial){let P0=p.uniformsGroups;for(let X6=0,G6=P0.length;X6<G6;X6++){let f9=P0[X6];X0.update(f9,f0),X0.bind(f9,f0)}}return f0}function v$(M,j){M.ambientLightColor.needsUpdate=j,M.lightProbe.needsUpdate=j,M.directionalLights.needsUpdate=j,M.directionalLightShadows.needsUpdate=j,M.pointLights.needsUpdate=j,M.pointLightShadows.needsUpdate=j,M.spotLights.needsUpdate=j,M.spotLightShadows.needsUpdate=j,M.rectAreaLights.needsUpdate=j,M.hemisphereLights.needsUpdate=j}function j$(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}if(this.getActiveCubeFace=function(){return f},this.getActiveMipmapLevel=function(){return k},this.getRenderTarget=function(){return w},this.setRenderTargetTextures=function(M,j,g){NJ.get(M.texture).__webglTexture=j,NJ.get(M.depthTexture).__webglTexture=g;let p=NJ.get(M);if(p.__hasExternalTextures=!0,p.__autoAllocateDepthBuffer=g===void 0,!p.__autoAllocateDepthBuffer){if(zJ.has("WEBGL_multisampled_render_to_texture")===!0)console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),p.__useRenderToTexture=!1}},this.setRenderTargetFramebuffer=function(M,j){let g=NJ.get(M);g.__webglFramebuffer=j,g.__useDefaultFramebuffer=j===void 0},this.setRenderTarget=function(M,j=0,g=0){w=M,f=j,k=g;let p=!0,v=null,ZJ=!1,qJ=!1;if(M){let LJ=NJ.get(M);if(LJ.__useDefaultFramebuffer!==void 0)UJ.bindFramebuffer(P.FRAMEBUFFER,null),p=!1;else if(LJ.__webglFramebuffer===void 0)WJ.setupRenderTarget(M);else if(LJ.__hasExternalTextures)WJ.rebindTextures(M,NJ.get(M.texture).__webglTexture,NJ.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){let _J=M.depthTexture;if(LJ.__boundDepthTexture!==_J){if(_J!==null&&NJ.has(_J)&&(M.width!==_J.image.width||M.height!==_J.image.height))throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");WJ.setupDepthRenderbuffer(M)}}let fJ=M.texture;if(fJ.isData3DTexture||fJ.isDataArrayTexture||fJ.isCompressedArrayTexture)qJ=!0;let xJ=NJ.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget){if(Array.isArray(xJ[j]))v=xJ[j][g];else v=xJ[j];ZJ=!0}else if(M.samples>0&&WJ.useMultisampledRTT(M)===!1)v=NJ.get(M).__webglMultisampledFramebuffer;else if(Array.isArray(xJ))v=xJ[g];else v=xJ;L.copy(M.viewport),S.copy(M.scissor),x=M.scissorTest}else L.copy(GJ).multiplyScalar(e).floor(),S.copy(wJ).multiplyScalar(e).floor(),x=pJ;if(UJ.bindFramebuffer(P.FRAMEBUFFER,v)&&p)UJ.drawBuffers(M,v);if(UJ.viewport(L),UJ.scissor(S),UJ.setScissorTest(x),ZJ){let LJ=NJ.get(M.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+j,LJ.__webglTexture,g)}else if(qJ){let LJ=NJ.get(M.texture),fJ=j||0;P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,LJ.__webglTexture,g||0,fJ)}b=-1},this.readRenderTargetPixels=function(M,j,g,p,v,ZJ,qJ){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let AJ=NJ.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&qJ!==void 0)AJ=AJ[qJ];if(AJ){UJ.bindFramebuffer(P.FRAMEBUFFER,AJ);try{let LJ=M.texture,fJ=LJ.format,xJ=LJ.type;if(!vJ.textureFormatReadable(fJ)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!vJ.textureTypeReadable(xJ)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(j>=0&&j<=M.width-p&&(g>=0&&g<=M.height-v))P.readPixels(j,g,p,v,bJ.convert(fJ),bJ.convert(xJ),ZJ)}finally{let LJ=w!==null?NJ.get(w).__webglFramebuffer:null;UJ.bindFramebuffer(P.FRAMEBUFFER,LJ)}}},this.readRenderTargetPixelsAsync=async function(M,j,g,p,v,ZJ,qJ){if(!(M&&M.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let AJ=NJ.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&qJ!==void 0)AJ=AJ[qJ];if(AJ){let LJ=M.texture,fJ=LJ.format,xJ=LJ.type;if(!vJ.textureFormatReadable(fJ))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!vJ.textureTypeReadable(xJ))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(j>=0&&j<=M.width-p&&(g>=0&&g<=M.height-v)){UJ.bindFramebuffer(P.FRAMEBUFFER,AJ);let _J=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,_J),P.bufferData(P.PIXEL_PACK_BUFFER,ZJ.byteLength,P.STREAM_READ),P.readPixels(j,g,p,v,bJ.convert(fJ),bJ.convert(xJ),0);let iJ=w!==null?NJ.get(w).__webglFramebuffer:null;UJ.bindFramebuffer(P.FRAMEBUFFER,iJ);let Q0=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await b$(P,Q0,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,_J),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,ZJ),P.deleteBuffer(_J),P.deleteSync(Q0),ZJ}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(M,j=null,g=0){if(M.isTexture!==!0)N7("WebGLRenderer: copyFramebufferToTexture function signature has changed."),j=arguments[0]||null,M=arguments[1];let p=Math.pow(2,-g),v=Math.floor(M.image.width*p),ZJ=Math.floor(M.image.height*p),qJ=j!==null?j.x:0,AJ=j!==null?j.y:0;WJ.setTexture2D(M,0),P.copyTexSubImage2D(P.TEXTURE_2D,g,0,0,qJ,AJ,v,ZJ),UJ.unbindTexture()},this.copyTextureToTexture=function(M,j,g=null,p=null,v=0){if(M.isTexture!==!0)N7("WebGLRenderer: copyTextureToTexture function signature has changed."),p=arguments[0]||null,M=arguments[1],j=arguments[2],v=arguments[3]||0,g=null;let ZJ,qJ,AJ,LJ,fJ,xJ,_J,iJ,Q0,W0=M.isCompressedTexture?M.mipmaps[v]:M.image;if(g!==null)ZJ=g.max.x-g.min.x,qJ=g.max.y-g.min.y,AJ=g.isBox3?g.max.z-g.min.z:1,LJ=g.min.x,fJ=g.min.y,xJ=g.isBox3?g.min.z:0;else ZJ=W0.width,qJ=W0.height,AJ=W0.depth||1,LJ=0,fJ=0,xJ=0;if(p!==null)_J=p.x,iJ=p.y,Q0=p.z;else _J=0,iJ=0,Q0=0;let k0=bJ.convert(j.format),rJ=bJ.convert(j.type),CJ;if(j.isData3DTexture)WJ.setTexture3D(j,0),CJ=P.TEXTURE_3D;else if(j.isDataArrayTexture||j.isCompressedArrayTexture)WJ.setTexture2DArray(j,0),CJ=P.TEXTURE_2D_ARRAY;else WJ.setTexture2D(j,0),CJ=P.TEXTURE_2D;P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,j.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,j.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,j.unpackAlignment);let i0=P.getParameter(P.UNPACK_ROW_LENGTH),tJ=P.getParameter(P.UNPACK_IMAGE_HEIGHT),f0=P.getParameter(P.UNPACK_SKIP_PIXELS),j6=P.getParameter(P.UNPACK_SKIP_ROWS),C0=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,W0.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,W0.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,LJ),P.pixelStorei(P.UNPACK_SKIP_ROWS,fJ),P.pixelStorei(P.UNPACK_SKIP_IMAGES,xJ);let G7=M.isDataArrayTexture||M.isData3DTexture,Y0=j.isDataArrayTexture||j.isData3DTexture;if(M.isRenderTargetTexture||M.isDepthTexture){let u0=NJ.get(M),U7=NJ.get(j),P0=NJ.get(u0.__renderTarget),X6=NJ.get(U7.__renderTarget);UJ.bindFramebuffer(P.READ_FRAMEBUFFER,P0.__webglFramebuffer),UJ.bindFramebuffer(P.DRAW_FRAMEBUFFER,X6.__webglFramebuffer);for(let G6=0;G6<AJ;G6++){if(G7)P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,NJ.get(M).__webglTexture,v,xJ+G6);if(M.isDepthTexture){if(Y0)P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,NJ.get(j).__webglTexture,v,Q0+G6);P.blitFramebuffer(LJ,fJ,ZJ,qJ,_J,iJ,ZJ,qJ,P.DEPTH_BUFFER_BIT,P.NEAREST)}else if(Y0)P.copyTexSubImage3D(CJ,v,_J,iJ,Q0+G6,LJ,fJ,ZJ,qJ);else P.copyTexSubImage2D(CJ,v,_J,iJ,Q0+G6,LJ,fJ,ZJ,qJ)}UJ.bindFramebuffer(P.READ_FRAMEBUFFER,null),UJ.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if(Y0)if(M.isDataTexture||M.isData3DTexture)P.texSubImage3D(CJ,v,_J,iJ,Q0,ZJ,qJ,AJ,k0,rJ,W0.data);else if(j.isCompressedArrayTexture)P.compressedTexSubImage3D(CJ,v,_J,iJ,Q0,ZJ,qJ,AJ,k0,W0.data);else P.texSubImage3D(CJ,v,_J,iJ,Q0,ZJ,qJ,AJ,k0,rJ,W0);else if(M.isDataTexture)P.texSubImage2D(P.TEXTURE_2D,v,_J,iJ,ZJ,qJ,k0,rJ,W0.data);else if(M.isCompressedTexture)P.compressedTexSubImage2D(P.TEXTURE_2D,v,_J,iJ,W0.width,W0.height,k0,W0.data);else P.texSubImage2D(P.TEXTURE_2D,v,_J,iJ,ZJ,qJ,k0,rJ,W0);if(P.pixelStorei(P.UNPACK_ROW_LENGTH,i0),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,tJ),P.pixelStorei(P.UNPACK_SKIP_PIXELS,f0),P.pixelStorei(P.UNPACK_SKIP_ROWS,j6),P.pixelStorei(P.UNPACK_SKIP_IMAGES,C0),v===0&&j.generateMipmaps)P.generateMipmap(CJ);UJ.unbindTexture()},this.copyTextureToTexture3D=function(M,j,g=null,p=null,v=0){if(M.isTexture!==!0)N7("WebGLRenderer: copyTextureToTexture3D function signature has changed."),g=arguments[0]||null,p=arguments[1]||null,M=arguments[2],j=arguments[3],v=arguments[4]||0;return N7('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(M,j,g,p,v)},this.initRenderTarget=function(M){if(NJ.get(M).__webglFramebuffer===void 0)WJ.setupRenderTarget(M)},this.initTexture=function(M){if(M.isCubeTexture)WJ.setTextureCube(M,0);else if(M.isData3DTexture)WJ.setTexture3D(M,0);else if(M.isDataArrayTexture||M.isCompressedArrayTexture)WJ.setTexture2DArray(M,0);else WJ.setTexture2D(M,0);UJ.unbindTexture()},this.resetState=function(){f=0,k=0,w=null,UJ.reset(),cJ.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2000}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let $=this.getContext();$.drawingBufferColorspace=oJ._getDrawingBufferColorSpace(J),$.unpackColorSpace=oJ._getUnpackColorSpace()}}class Y8{constructor(J,$=1,Q=1000){this.isFog=!0,this.name="",this.color=new nJ(J),this.near=$,this.far=Q}clone(){return new Y8(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class q9 extends F0{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new c0,this.environmentIntensity=1,this.environmentRotation=new c0,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,$){if(super.copy(J,$),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let $=super.toJSON(J);if(this.fog!==null)$.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)$.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)$.object.backgroundIntensity=this.backgroundIntensity;if($.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)$.object.environmentIntensity=this.environmentIntensity;return $.object.environmentRotation=this.environmentRotation.toArray(),$}}class U${constructor(J,$){this.isInterleavedBuffer=!0,this.array=J,this.stride=$,this.count=J!==void 0?J.length/$:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=R6()}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,$){this.updateRanges.push({start:J,count:$})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.array=new J.array.constructor(J.array),this.count=J.count,this.stride=J.stride,this.usage=J.usage,this}copyAt(J,$,Q){J*=this.stride,Q*=$.stride;for(let Z=0,W=this.stride;Z<W;Z++)this.array[J+Z]=$.array[Q+Z];return this}set(J,$=0){return this.array.set(J,$),this}clone(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=R6();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let $=new this.array.constructor(J.arrayBuffers[this.array.buffer._uuid]),Q=new this.constructor($,this.stride);return Q.setUsage(this.usage),Q}onUpload(J){return this.onUploadCallback=J,this}toJSON(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=R6();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}var A0=new T;class e7{constructor(J,$,Q,Z=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=J,this.itemSize=$,this.offset=Q,this.normalized=Z}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(J){this.data.needsUpdate=J}applyMatrix4(J){for(let $=0,Q=this.data.count;$<Q;$++)A0.fromBufferAttribute(this,$),A0.applyMatrix4(J),this.setXYZ($,A0.x,A0.y,A0.z);return this}applyNormalMatrix(J){for(let $=0,Q=this.count;$<Q;$++)A0.fromBufferAttribute(this,$),A0.applyNormalMatrix(J),this.setXYZ($,A0.x,A0.y,A0.z);return this}transformDirection(J){for(let $=0,Q=this.count;$<Q;$++)A0.fromBufferAttribute(this,$),A0.transformDirection(J),this.setXYZ($,A0.x,A0.y,A0.z);return this}getComponent(J,$){let Q=this.array[J*this.data.stride+this.offset+$];if(this.normalized)Q=d0(Q,this.array);return Q}setComponent(J,$,Q){if(this.normalized)Q=J0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+$]=Q,this}setX(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset]=$,this}setY(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset+1]=$,this}setZ(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset+2]=$,this}setW(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset+3]=$,this}getX(J){let $=this.data.array[J*this.data.stride+this.offset];if(this.normalized)$=d0($,this.array);return $}getY(J){let $=this.data.array[J*this.data.stride+this.offset+1];if(this.normalized)$=d0($,this.array);return $}getZ(J){let $=this.data.array[J*this.data.stride+this.offset+2];if(this.normalized)$=d0($,this.array);return $}getW(J){let $=this.data.array[J*this.data.stride+this.offset+3];if(this.normalized)$=d0($,this.array);return $}setXY(J,$,Q){if(J=J*this.data.stride+this.offset,this.normalized)$=J0($,this.array),Q=J0(Q,this.array);return this.data.array[J+0]=$,this.data.array[J+1]=Q,this}setXYZ(J,$,Q,Z){if(J=J*this.data.stride+this.offset,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array);return this.data.array[J+0]=$,this.data.array[J+1]=Q,this.data.array[J+2]=Z,this}setXYZW(J,$,Q,Z,W){if(J=J*this.data.stride+this.offset,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array),W=J0(W,this.array);return this.data.array[J+0]=$,this.data.array[J+1]=Q,this.data.array[J+2]=Z,this.data.array[J+3]=W,this}clone(J){if(J===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let $=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)$.push(this.data.array[Z+W])}return new j0(new this.array.constructor($),this.itemSize,this.normalized)}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.clone(J);return new e7(J.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(J){if(J===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let $=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)$.push(this.data.array[Z+W])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:$,normalized:this.normalized}}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.toJSON(J);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}class K8 extends y6{static get type(){return"SpriteMaterial"}constructor(J){super();this.isSpriteMaterial=!0,this.color=new nJ(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.rotation=J.rotation,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var o6,F7=new T,i6=new T,a6=new T,r6=new MJ,D7=new MJ,H$=new K0,n7=new T,R7=new T,s7=new T,C5=new MJ,s8=new MJ,w5=new MJ;class E9 extends F0{constructor(J=new K8){super();if(this.isSprite=!0,this.type="Sprite",o6===void 0){o6=new z0;let $=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),Q=new U$($,5);o6.setIndex([0,1,2,0,2,3]),o6.setAttribute("position",new e7(Q,3,0,!1)),o6.setAttribute("uv",new e7(Q,2,3,!1))}this.geometry=o6,this.material=J,this.center=new MJ(0.5,0.5)}raycast(J,$){if(J.camera===null)console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if(i6.setFromMatrixScale(this.matrixWorld),H$.copy(J.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(J.camera.matrixWorldInverse,this.matrixWorld),a6.setFromMatrixPosition(this.modelViewMatrix),J.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)i6.multiplyScalar(-a6.z);let Q=this.material.rotation,Z,W;if(Q!==0)W=Math.cos(Q),Z=Math.sin(Q);let Y=this.center;o7(n7.set(-0.5,-0.5,0),a6,Y,i6,Z,W),o7(R7.set(0.5,-0.5,0),a6,Y,i6,Z,W),o7(s7.set(0.5,0.5,0),a6,Y,i6,Z,W),C5.set(0,0),s8.set(1,0),w5.set(1,1);let K=J.ray.intersectTriangle(n7,R7,s7,!1,F7);if(K===null){if(o7(R7.set(-0.5,0.5,0),a6,Y,i6,Z,W),s8.set(0,1),K=J.ray.intersectTriangle(n7,s7,R7,!1,F7),K===null)return}let X=J.ray.origin.distanceTo(F7);if(X<J.near||X>J.far)return;$.push({distance:X,point:F7.clone(),uv:v0.getInterpolation(F7,n7,R7,s7,C5,s8,w5,new MJ),face:null,object:this})}copy(J,$){if(super.copy(J,$),J.center!==void 0)this.center.copy(J.center);return this.material=J.material,this}}function o7(J,$,Q,Z,W,Y){if(r6.subVectors(J,Q).addScalar(0.5).multiply(Z),W!==void 0)D7.x=Y*r6.x-W*r6.y,D7.y=W*r6.x+Y*r6.y;else D7.copy(r6);J.copy($),J.x+=D7.x,J.y+=D7.y,J.applyMatrix4(H$)}class X8 extends _0{constructor(J,$,Q,Z,W,Y,K,X,G){super(J,$,Q,Z,W,Y,K,X,G);this.isCanvasTexture=!0,this.needsUpdate=!0}}class n0{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(J,$){let Q=this.getUtoTmapping(J);return this.getPoint(Q,$)}getPoints(J=5){let $=[];for(let Q=0;Q<=J;Q++)$.push(this.getPoint(Q/J));return $}getSpacedPoints(J=5){let $=[];for(let Q=0;Q<=J;Q++)$.push(this.getPointAt(Q/J));return $}getLength(){let J=this.getLengths();return J[J.length-1]}getLengths(J=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===J+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let $=[],Q,Z=this.getPoint(0),W=0;$.push(0);for(let Y=1;Y<=J;Y++)Q=this.getPoint(Y/J),W+=Q.distanceTo(Z),$.push(W),Z=Q;return this.cacheArcLengths=$,$}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(J,$){let Q=this.getLengths(),Z=0,W=Q.length,Y;if($)Y=$;else Y=J*Q[W-1];let K=0,X=W-1,G;while(K<=X)if(Z=Math.floor(K+(X-K)/2),G=Q[Z]-Y,G<0)K=Z+1;else if(G>0)X=Z-1;else{X=Z;break}if(Z=X,Q[Z]===Y)return Z/(W-1);let U=Q[Z],H=Q[Z+1]-U,q=(Y-U)/H;return(Z+q)/(W-1)}getTangent(J,$){let Z=J-0.0001,W=J+0.0001;if(Z<0)Z=0;if(W>1)W=1;let Y=this.getPoint(Z),K=this.getPoint(W),X=$||(Y.isVector2?new MJ:new T);return X.copy(K).sub(Y).normalize(),X}getTangentAt(J,$){let Q=this.getUtoTmapping(J);return this.getTangent(Q,$)}computeFrenetFrames(J,$){let Q=new T,Z=[],W=[],Y=[],K=new T,X=new K0;for(let q=0;q<=J;q++){let D=q/J;Z[q]=this.getTangentAt(D,new T)}W[0]=new T,Y[0]=new T;let G=Number.MAX_VALUE,U=Math.abs(Z[0].x),V=Math.abs(Z[0].y),H=Math.abs(Z[0].z);if(U<=G)G=U,Q.set(1,0,0);if(V<=G)G=V,Q.set(0,1,0);if(H<=G)Q.set(0,0,1);K.crossVectors(Z[0],Q).normalize(),W[0].crossVectors(Z[0],K),Y[0].crossVectors(Z[0],W[0]);for(let q=1;q<=J;q++){if(W[q]=W[q-1].clone(),Y[q]=Y[q-1].clone(),K.crossVectors(Z[q-1],Z[q]),K.length()>Number.EPSILON){K.normalize();let D=Math.acos(M0(Z[q-1].dot(Z[q]),-1,1));W[q].applyMatrix4(X.makeRotationAxis(K,D))}Y[q].crossVectors(Z[q],W[q])}if($===!0){let q=Math.acos(M0(W[0].dot(W[J]),-1,1));if(q/=J,Z[0].dot(K.crossVectors(W[0],W[J]))>0)q=-q;for(let D=1;D<=J;D++)W[D].applyMatrix4(X.makeRotationAxis(Z[D],q*D)),Y[D].crossVectors(Z[D],W[D])}return{tangents:Z,normals:W,binormals:Y}}clone(){return new this.constructor().copy(this)}copy(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}toJSON(){let J={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return J.arcLengthDivisions=this.arcLengthDivisions,J.type=this.type,J}fromJSON(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}}class F9 extends n0{constructor(J=0,$=0,Q=1,Z=1,W=0,Y=Math.PI*2,K=!1,X=0){super();this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=J,this.aY=$,this.xRadius=Q,this.yRadius=Z,this.aStartAngle=W,this.aEndAngle=Y,this.aClockwise=K,this.aRotation=X}getPoint(J,$=new MJ){let Q=$,Z=Math.PI*2,W=this.aEndAngle-this.aStartAngle,Y=Math.abs(W)<Number.EPSILON;while(W<0)W+=Z;while(W>Z)W-=Z;if(W<Number.EPSILON)if(Y)W=0;else W=Z;if(this.aClockwise===!0&&!Y)if(W===Z)W=-Z;else W=W-Z;let K=this.aStartAngle+J*W,X=this.aX+this.xRadius*Math.cos(K),G=this.aY+this.yRadius*Math.sin(K);if(this.aRotation!==0){let U=Math.cos(this.aRotation),V=Math.sin(this.aRotation),H=X-this.aX,q=G-this.aY;X=H*U-q*V+this.aX,G=H*V+q*U+this.aY}return Q.set(X,G)}copy(J){return super.copy(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}toJSON(){let J=super.toJSON();return J.aX=this.aX,J.aY=this.aY,J.xRadius=this.xRadius,J.yRadius=this.yRadius,J.aStartAngle=this.aStartAngle,J.aEndAngle=this.aEndAngle,J.aClockwise=this.aClockwise,J.aRotation=this.aRotation,J}fromJSON(J){return super.fromJSON(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}}class V$ extends F9{constructor(J,$,Q,Z,W,Y){super(J,$,Q,Q,Z,W,Y);this.isArcCurve=!0,this.type="ArcCurve"}}function D9(){let J=0,$=0,Q=0,Z=0;function W(Y,K,X,G){J=Y,$=X,Q=-3*Y+3*K-2*X-G,Z=2*Y-2*K+X+G}return{initCatmullRom:function(Y,K,X,G,U){W(K,X,U*(X-Y),U*(G-K))},initNonuniformCatmullRom:function(Y,K,X,G,U,V,H){let q=(K-Y)/U-(X-Y)/(U+V)+(X-K)/V,D=(X-K)/V-(G-K)/(V+H)+(G-X)/H;q*=V,D*=V,W(K,X,q,D)},calc:function(Y){let K=Y*Y,X=K*Y;return J+$*Y+Q*K+Z*X}}}var i7=new T,o8=new D9,i8=new D9,a8=new D9;class Q7 extends n0{constructor(J=[],$=!1,Q="centripetal",Z=0.5){super();this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=J,this.closed=$,this.curveType=Q,this.tension=Z}getPoint(J,$=new T){let Q=$,Z=this.points,W=Z.length,Y=(W-(this.closed?0:1))*J,K=Math.floor(Y),X=Y-K;if(this.closed)K+=K>0?0:(Math.floor(Math.abs(K)/W)+1)*W;else if(X===0&&K===W-1)K=W-2,X=1;let G,U;if(this.closed||K>0)G=Z[(K-1)%W];else i7.subVectors(Z[0],Z[1]).add(Z[0]),G=i7;let V=Z[K%W],H=Z[(K+1)%W];if(this.closed||K+2<W)U=Z[(K+2)%W];else i7.subVectors(Z[W-1],Z[W-2]).add(Z[W-1]),U=i7;if(this.curveType==="centripetal"||this.curveType==="chordal"){let q=this.curveType==="chordal"?0.5:0.25,D=Math.pow(G.distanceToSquared(V),q),A=Math.pow(V.distanceToSquared(H),q),O=Math.pow(H.distanceToSquared(U),q);if(A<0.0001)A=1;if(D<0.0001)D=A;if(O<0.0001)O=A;o8.initNonuniformCatmullRom(G.x,V.x,H.x,U.x,D,A,O),i8.initNonuniformCatmullRom(G.y,V.y,H.y,U.y,D,A,O),a8.initNonuniformCatmullRom(G.z,V.z,H.z,U.z,D,A,O)}else if(this.curveType==="catmullrom")o8.initCatmullRom(G.x,V.x,H.x,U.x,this.tension),i8.initCatmullRom(G.y,V.y,H.y,U.y,this.tension),a8.initCatmullRom(G.z,V.z,H.z,U.z,this.tension);return Q.set(o8.calc(X),i8.calc(X),a8.calc(X)),Q}copy(J){super.copy(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(Z.clone())}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}toJSON(){let J=super.toJSON();J.points=[];for(let $=0,Q=this.points.length;$<Q;$++){let Z=this.points[$];J.points.push(Z.toArray())}return J.closed=this.closed,J.curveType=this.curveType,J.tension=this.tension,J}fromJSON(J){super.fromJSON(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(new T().fromArray(Z))}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}}function I5(J,$,Q,Z,W){let Y=(Z-$)*0.5,K=(W-Q)*0.5,X=J*J,G=J*X;return(2*Q-2*Z+Y+K)*G+(-3*Q+3*Z-2*Y-K)*X+Y*J+Q}function vY(J,$){let Q=1-J;return Q*Q*$}function jY(J,$){return 2*(1-J)*J*$}function fY(J,$){return J*J*$}function B7(J,$,Q,Z){return vY(J,$)+jY(J,Q)+fY(J,Z)}function hY(J,$){let Q=1-J;return Q*Q*Q*$}function bY(J,$){let Q=1-J;return 3*Q*Q*J*$}function xY(J,$){return 3*(1-J)*J*J*$}function gY(J,$){return J*J*J*$}function A7(J,$,Q,Z,W){return hY(J,$)+bY(J,Q)+xY(J,Z)+gY(J,W)}class q$ extends n0{constructor(J=new MJ,$=new MJ,Q=new MJ,Z=new MJ){super();this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=J,this.v1=$,this.v2=Q,this.v3=Z}getPoint(J,$=new MJ){let Q=$,Z=this.v0,W=this.v1,Y=this.v2,K=this.v3;return Q.set(A7(J,Z.x,W.x,Y.x,K.x),A7(J,Z.y,W.y,Y.y,K.y)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class E$ extends n0{constructor(J=new T,$=new T,Q=new T,Z=new T){super();this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=J,this.v1=$,this.v2=Q,this.v3=Z}getPoint(J,$=new T){let Q=$,Z=this.v0,W=this.v1,Y=this.v2,K=this.v3;return Q.set(A7(J,Z.x,W.x,Y.x,K.x),A7(J,Z.y,W.y,Y.y,K.y),A7(J,Z.z,W.z,Y.z,K.z)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class F$ extends n0{constructor(J=new MJ,$=new MJ){super();this.isLineCurve=!0,this.type="LineCurve",this.v1=J,this.v2=$}getPoint(J,$=new MJ){let Q=$;if(J===1)Q.copy(this.v2);else Q.copy(this.v2).sub(this.v1),Q.multiplyScalar(J).add(this.v1);return Q}getPointAt(J,$){return this.getPoint(J,$)}getTangent(J,$=new MJ){return $.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,$){return this.getTangent(J,$)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class D$ extends n0{constructor(J=new T,$=new T){super();this.isLineCurve3=!0,this.type="LineCurve3",this.v1=J,this.v2=$}getPoint(J,$=new T){let Q=$;if(J===1)Q.copy(this.v2);else Q.copy(this.v2).sub(this.v1),Q.multiplyScalar(J).add(this.v1);return Q}getPointAt(J,$){return this.getPoint(J,$)}getTangent(J,$=new T){return $.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,$){return this.getTangent(J,$)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class R$ extends n0{constructor(J=new MJ,$=new MJ,Q=new MJ){super();this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=J,this.v1=$,this.v2=Q}getPoint(J,$=new MJ){let Q=$,Z=this.v0,W=this.v1,Y=this.v2;return Q.set(B7(J,Z.x,W.x,Y.x),B7(J,Z.y,W.y,Y.y)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class R9 extends n0{constructor(J=new T,$=new T,Q=new T){super();this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=J,this.v1=$,this.v2=Q}getPoint(J,$=new T){let Q=$,Z=this.v0,W=this.v1,Y=this.v2;return Q.set(B7(J,Z.x,W.x,Y.x),B7(J,Z.y,W.y,Y.y),B7(J,Z.z,W.z,Y.z)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class N$ extends n0{constructor(J=[]){super();this.isSplineCurve=!0,this.type="SplineCurve",this.points=J}getPoint(J,$=new MJ){let Q=$,Z=this.points,W=(Z.length-1)*J,Y=Math.floor(W),K=W-Y,X=Z[Y===0?Y:Y-1],G=Z[Y],U=Z[Y>Z.length-2?Z.length-1:Y+1],V=Z[Y>Z.length-3?Z.length-1:Y+2];return Q.set(I5(K,X.x,G.x,U.x,V.x),I5(K,X.y,G.y,U.y,V.y)),Q}copy(J){super.copy(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(Z.clone())}return this}toJSON(){let J=super.toJSON();J.points=[];for(let $=0,Q=this.points.length;$<Q;$++){let Z=this.points[$];J.points.push(Z.toArray())}return J}fromJSON(J){super.fromJSON(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(new MJ().fromArray(Z))}return this}}var pY=Object.freeze({__proto__:null,ArcCurve:V$,CatmullRomCurve3:Q7,CubicBezierCurve:q$,CubicBezierCurve3:E$,EllipseCurve:F9,LineCurve:F$,LineCurve3:D$,QuadraticBezierCurve:R$,QuadraticBezierCurve3:R9,SplineCurve:N$});class G8 extends z0{constructor(J=1,$=32,Q=0,Z=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:J,segments:$,thetaStart:Q,thetaLength:Z},$=Math.max(3,$);let W=[],Y=[],K=[],X=[],G=new T,U=new MJ;Y.push(0,0,0),K.push(0,0,1),X.push(0.5,0.5);for(let V=0,H=3;V<=$;V++,H+=3){let q=Q+V/$*Z;G.x=J*Math.cos(q),G.y=J*Math.sin(q),Y.push(G.x,G.y,G.z),K.push(0,0,1),U.x=(Y[H]/J+1)/2,U.y=(Y[H+1]/J+1)/2,X.push(U.x,U.y)}for(let V=1;V<=$;V++)W.push(V,V+1,0);this.setIndex(W),this.setAttribute("position",new eJ(Y,3)),this.setAttribute("normal",new eJ(K,3)),this.setAttribute("uv",new eJ(X,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new G8(J.radius,J.segments,J.thetaStart,J.thetaLength)}}class B0 extends z0{constructor(J=1,$=1,Q=1,Z=32,W=1,Y=!1,K=0,X=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:J,radiusBottom:$,height:Q,radialSegments:Z,heightSegments:W,openEnded:Y,thetaStart:K,thetaLength:X};let G=this;Z=Math.floor(Z),W=Math.floor(W);let U=[],V=[],H=[],q=[],D=0,A=[],O=Q/2,F=0;if(E(),Y===!1){if(J>0)_(!0);if($>0)_(!1)}this.setIndex(U),this.setAttribute("position",new eJ(V,3)),this.setAttribute("normal",new eJ(H,3)),this.setAttribute("uv",new eJ(q,2));function E(){let N=new T,C=new T,f=0,k=($-J)/Q;for(let w=0;w<=W;w++){let b=[],B=w/W,L=B*($-J)+J;for(let S=0;S<=Z;S++){let x=S/Z,l=x*X+K,s=Math.sin(l),d=Math.cos(l);C.x=L*s,C.y=-B*Q+O,C.z=L*d,V.push(C.x,C.y,C.z),N.set(s,k,d).normalize(),H.push(N.x,N.y,N.z),q.push(x,1-B),b.push(D++)}A.push(b)}for(let w=0;w<Z;w++)for(let b=0;b<W;b++){let B=A[b][w],L=A[b+1][w],S=A[b+1][w+1],x=A[b][w+1];if(J>0||b!==0)U.push(B,L,x),f+=3;if($>0||b!==W-1)U.push(L,S,x),f+=3}G.addGroup(F,f,0),F+=f}function _(N){let C=D,f=new MJ,k=new T,w=0,b=N===!0?J:$,B=N===!0?1:-1;for(let S=1;S<=Z;S++)V.push(0,O*B,0),H.push(0,B,0),q.push(0.5,0.5),D++;let L=D;for(let S=0;S<=Z;S++){let l=S/Z*X+K,s=Math.cos(l),d=Math.sin(l);k.x=b*d,k.y=O*B,k.z=b*s,V.push(k.x,k.y,k.z),H.push(0,B,0),f.x=s*0.5+0.5,f.y=d*0.5*B+0.5,q.push(f.x,f.y),D++}for(let S=0;S<Z;S++){let x=C+S,l=L+S;if(N===!0)U.push(l,l+1,x);else U.push(l+1,l,x);w+=3}G.addGroup(F,w,N===!0?1:2),F+=w}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new B0(J.radiusTop,J.radiusBottom,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class N9 extends z0{constructor(J=[],$=[],Q=1,Z=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:J,indices:$,radius:Q,detail:Z};let W=[],Y=[];if(K(Z),G(Q),U(),this.setAttribute("position",new eJ(W,3)),this.setAttribute("normal",new eJ(W.slice(),3)),this.setAttribute("uv",new eJ(Y,2)),Z===0)this.computeVertexNormals();else this.normalizeNormals();function K(E){let _=new T,N=new T,C=new T;for(let f=0;f<$.length;f+=3)q($[f+0],_),q($[f+1],N),q($[f+2],C),X(_,N,C,E)}function X(E,_,N,C){let f=C+1,k=[];for(let w=0;w<=f;w++){k[w]=[];let b=E.clone().lerp(N,w/f),B=_.clone().lerp(N,w/f),L=f-w;for(let S=0;S<=L;S++)if(S===0&&w===f)k[w][S]=b;else k[w][S]=b.clone().lerp(B,S/L)}for(let w=0;w<f;w++)for(let b=0;b<2*(f-w)-1;b++){let B=Math.floor(b/2);if(b%2===0)H(k[w][B+1]),H(k[w+1][B]),H(k[w][B]);else H(k[w][B+1]),H(k[w+1][B+1]),H(k[w+1][B])}}function G(E){let _=new T;for(let N=0;N<W.length;N+=3)_.x=W[N+0],_.y=W[N+1],_.z=W[N+2],_.normalize().multiplyScalar(E),W[N+0]=_.x,W[N+1]=_.y,W[N+2]=_.z}function U(){let E=new T;for(let _=0;_<W.length;_+=3){E.x=W[_+0],E.y=W[_+1],E.z=W[_+2];let N=O(E)/2/Math.PI+0.5,C=F(E)/Math.PI+0.5;Y.push(N,1-C)}D(),V()}function V(){for(let E=0;E<Y.length;E+=6){let _=Y[E+0],N=Y[E+2],C=Y[E+4],f=Math.max(_,N,C),k=Math.min(_,N,C);if(f>0.9&&k<0.1){if(_<0.2)Y[E+0]+=1;if(N<0.2)Y[E+2]+=1;if(C<0.2)Y[E+4]+=1}}}function H(E){W.push(E.x,E.y,E.z)}function q(E,_){let N=E*3;_.x=J[N+0],_.y=J[N+1],_.z=J[N+2]}function D(){let E=new T,_=new T,N=new T,C=new T,f=new MJ,k=new MJ,w=new MJ;for(let b=0,B=0;b<W.length;b+=9,B+=6){E.set(W[b+0],W[b+1],W[b+2]),_.set(W[b+3],W[b+4],W[b+5]),N.set(W[b+6],W[b+7],W[b+8]),f.set(Y[B+0],Y[B+1]),k.set(Y[B+2],Y[B+3]),w.set(Y[B+4],Y[B+5]),C.copy(E).add(_).add(N).divideScalar(3);let L=O(C);A(f,B+0,E,L),A(k,B+2,_,L),A(w,B+4,N,L)}}function A(E,_,N,C){if(C<0&&E.x===1)Y[_]=E.x-1;if(N.x===0&&N.z===0)Y[_]=C/2/Math.PI+0.5}function O(E){return Math.atan2(E.z,-E.x)}function F(E){return Math.atan2(-E.y,Math.sqrt(E.x*E.x+E.z*E.z))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new N9(J.vertices,J.indices,J.radius,J.details)}}class U8 extends N9{constructor(J=1,$=0){let Q=(1+Math.sqrt(5))/2,Z=1/Q,W=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-Z,-Q,0,-Z,Q,0,Z,-Q,0,Z,Q,-Z,-Q,0,-Z,Q,0,Z,-Q,0,Z,Q,0,-Q,0,-Z,Q,0,-Z,-Q,0,Z,Q,0,Z],Y=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(W,Y,J,$);this.type="DodecahedronGeometry",this.parameters={radius:J,detail:$}}static fromJSON(J){return new U8(J.radius,J.detail)}}class H8 extends z0{constructor(J=0.5,$=1,Q=32,Z=1,W=0,Y=Math.PI*2){super();this.type="RingGeometry",this.parameters={innerRadius:J,outerRadius:$,thetaSegments:Q,phiSegments:Z,thetaStart:W,thetaLength:Y},Q=Math.max(3,Q),Z=Math.max(1,Z);let K=[],X=[],G=[],U=[],V=J,H=($-J)/Z,q=new T,D=new MJ;for(let A=0;A<=Z;A++){for(let O=0;O<=Q;O++){let F=W+O/Q*Y;q.x=V*Math.cos(F),q.y=V*Math.sin(F),X.push(q.x,q.y,q.z),G.push(0,0,1),D.x=(q.x/$+1)/2,D.y=(q.y/$+1)/2,U.push(D.x,D.y)}V+=H}for(let A=0;A<Z;A++){let O=A*(Q+1);for(let F=0;F<Q;F++){let E=F+O,_=E,N=E+Q+1,C=E+Q+2,f=E+1;K.push(_,N,f),K.push(N,C,f)}}this.setIndex(K),this.setAttribute("position",new eJ(X,3)),this.setAttribute("normal",new eJ(G,3)),this.setAttribute("uv",new eJ(U,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new H8(J.innerRadius,J.outerRadius,J.thetaSegments,J.phiSegments,J.thetaStart,J.thetaLength)}}class W6 extends z0{constructor(J=1,$=32,Q=16,Z=0,W=Math.PI*2,Y=0,K=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:$,heightSegments:Q,phiStart:Z,phiLength:W,thetaStart:Y,thetaLength:K},$=Math.max(3,Math.floor($)),Q=Math.max(2,Math.floor(Q));let X=Math.min(Y+K,Math.PI),G=0,U=[],V=new T,H=new T,q=[],D=[],A=[],O=[];for(let F=0;F<=Q;F++){let E=[],_=F/Q,N=0;if(F===0&&Y===0)N=0.5/$;else if(F===Q&&X===Math.PI)N=-0.5/$;for(let C=0;C<=$;C++){let f=C/$;V.x=-J*Math.cos(Z+f*W)*Math.sin(Y+_*K),V.y=J*Math.cos(Y+_*K),V.z=J*Math.sin(Z+f*W)*Math.sin(Y+_*K),D.push(V.x,V.y,V.z),H.copy(V).normalize(),A.push(H.x,H.y,H.z),O.push(f+N,1-_),E.push(G++)}U.push(E)}for(let F=0;F<Q;F++)for(let E=0;E<$;E++){let _=U[F][E+1],N=U[F][E],C=U[F+1][E],f=U[F+1][E+1];if(F!==0||Y>0)q.push(_,N,f);if(F!==Q-1||X<Math.PI)q.push(N,C,f)}this.setIndex(q),this.setAttribute("position",new eJ(D,3)),this.setAttribute("normal",new eJ(A,3)),this.setAttribute("uv",new eJ(O,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new W6(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}class g0 extends z0{constructor(J=1,$=0.4,Q=12,Z=48,W=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:J,tube:$,radialSegments:Q,tubularSegments:Z,arc:W},Q=Math.floor(Q),Z=Math.floor(Z);let Y=[],K=[],X=[],G=[],U=new T,V=new T,H=new T;for(let q=0;q<=Q;q++)for(let D=0;D<=Z;D++){let A=D/Z*W,O=q/Q*Math.PI*2;V.x=(J+$*Math.cos(O))*Math.cos(A),V.y=(J+$*Math.cos(O))*Math.sin(A),V.z=$*Math.sin(O),K.push(V.x,V.y,V.z),U.x=J*Math.cos(A),U.y=J*Math.sin(A),H.subVectors(V,U).normalize(),X.push(H.x,H.y,H.z),G.push(D/Z),G.push(q/Q)}for(let q=1;q<=Q;q++)for(let D=1;D<=Z;D++){let A=(Z+1)*q+D-1,O=(Z+1)*(q-1)+D-1,F=(Z+1)*(q-1)+D,E=(Z+1)*q+D;Y.push(A,O,E),Y.push(O,F,E)}this.setIndex(Y),this.setAttribute("position",new eJ(K,3)),this.setAttribute("normal",new eJ(X,3)),this.setAttribute("uv",new eJ(G,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new g0(J.radius,J.tube,J.radialSegments,J.tubularSegments,J.arc)}}class V8 extends z0{constructor(J=new R9(new T(-1,-1,0),new T(-1,1,0),new T(1,1,0)),$=64,Q=1,Z=8,W=!1){super();this.type="TubeGeometry",this.parameters={path:J,tubularSegments:$,radius:Q,radialSegments:Z,closed:W};let Y=J.computeFrenetFrames($,W);this.tangents=Y.tangents,this.normals=Y.normals,this.binormals=Y.binormals;let K=new T,X=new T,G=new MJ,U=new T,V=[],H=[],q=[],D=[];A(),this.setIndex(D),this.setAttribute("position",new eJ(V,3)),this.setAttribute("normal",new eJ(H,3)),this.setAttribute("uv",new eJ(q,2));function A(){for(let _=0;_<$;_++)O(_);O(W===!1?$:0),E(),F()}function O(_){U=J.getPointAt(_/$,U);let N=Y.normals[_],C=Y.binormals[_];for(let f=0;f<=Z;f++){let k=f/Z*Math.PI*2,w=Math.sin(k),b=-Math.cos(k);X.x=b*N.x+w*C.x,X.y=b*N.y+w*C.y,X.z=b*N.z+w*C.z,X.normalize(),H.push(X.x,X.y,X.z),K.x=U.x+Q*X.x,K.y=U.y+Q*X.y,K.z=U.z+Q*X.z,V.push(K.x,K.y,K.z)}}function F(){for(let _=1;_<=$;_++)for(let N=1;N<=Z;N++){let C=(Z+1)*(_-1)+(N-1),f=(Z+1)*_+(N-1),k=(Z+1)*_+N,w=(Z+1)*(_-1)+N;D.push(C,f,w),D.push(f,k,w)}}function E(){for(let _=0;_<=$;_++)for(let N=0;N<=Z;N++)G.x=_/$,G.y=N/Z,q.push(G.x,G.y)}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON();return J.path=this.parameters.path.toJSON(),J}static fromJSON(J){return new V8(new pY[J.path.type]().fromJSON(J.path),J.tubularSegments,J.radius,J.radialSegments,J.closed)}}class q8 extends y6{static get type(){return"MeshStandardMaterial"}constructor(J){super();this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new nJ(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new nJ(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new MJ(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new c0,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={STANDARD:""},this.color.copy(J.color),this.roughness=J.roughness,this.metalness=J.metalness,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.roughnessMap=J.roughnessMap,this.metalnessMap=J.metalnessMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.envMapIntensity=J.envMapIntensity,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}function a7(J,$,Q){if(!J||!Q&&J.constructor===$)return J;if(typeof $.BYTES_PER_ELEMENT==="number")return new $(J);return Array.prototype.slice.call(J)}function mY(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}class _7{constructor(J,$,Q,Z){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new $.constructor(Q),this.sampleValues=$,this.valueSize=Q,this.settings=null,this.DefaultSettings_={}}evaluate(J){let $=this.parameterPositions,Q=this._cachedIndex,Z=$[Q],W=$[Q-1];Q:{J:{let Y;$:{Z:if(!(J<Z)){for(let K=Q+2;;){if(Z===void 0){if(J<W)break Z;return Q=$.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}if(Q===K)break;if(W=Z,Z=$[++Q],J<Z)break J}Y=$.length;break $}if(!(J>=W)){let K=$[1];if(J<K)Q=2,W=K;for(let X=Q-2;;){if(W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Q===X)break;if(Z=W,W=$[--Q-1],J>=W)break J}Y=Q,Q=0;break $}break Q}while(Q<Y){let K=Q+Y>>>1;if(J<$[K])Y=K;else Q=K+1}if(Z=$[Q],W=$[Q-1],W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return Q=$.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}this._cachedIndex=Q,this.intervalChanged_(Q,W,Z)}return this.interpolate_(Q,W,J,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let $=this.resultBuffer,Q=this.sampleValues,Z=this.valueSize,W=J*Z;for(let Y=0;Y!==Z;++Y)$[Y]=Q[W+Y];return $}interpolate_(){throw Error("call to abstract method")}intervalChanged_(){}}class O$ extends _7{constructor(J,$,Q,Z){super(J,$,Q,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,$,Q){let Z=this.parameterPositions,W=J-2,Y=J+1,K=Z[W],X=Z[Y];if(K===void 0)switch(this.getSettings_().endingStart){case 2401:W=J,K=2*$-Q;break;case 2402:W=Z.length-2,K=$+Z[W]-Z[W+1];break;default:W=J,K=Q}if(X===void 0)switch(this.getSettings_().endingEnd){case 2401:Y=J,X=2*Q-$;break;case 2402:Y=1,X=Q+Z[1]-Z[0];break;default:Y=J-1,X=$}let G=(Q-$)*0.5,U=this.valueSize;this._weightPrev=G/($-K),this._weightNext=G/(X-Q),this._offsetPrev=W*U,this._offsetNext=Y*U}interpolate_(J,$,Q,Z){let W=this.resultBuffer,Y=this.sampleValues,K=this.valueSize,X=J*K,G=X-K,U=this._offsetPrev,V=this._offsetNext,H=this._weightPrev,q=this._weightNext,D=(Q-$)/(Z-$),A=D*D,O=A*D,F=-H*O+2*H*A-H*D,E=(1+H)*O+(-1.5-2*H)*A+(-0.5+H)*D+1,_=(-1-q)*O+(1.5+q)*A+0.5*D,N=q*O-q*A;for(let C=0;C!==K;++C)W[C]=F*Y[U+C]+E*Y[G+C]+_*Y[X+C]+N*Y[V+C];return W}}class M$ extends _7{constructor(J,$,Q,Z){super(J,$,Q,Z)}interpolate_(J,$,Q,Z){let W=this.resultBuffer,Y=this.sampleValues,K=this.valueSize,X=J*K,G=X-K,U=(Q-$)/(Z-$),V=1-U;for(let H=0;H!==K;++H)W[H]=Y[G+H]*V+Y[X+H]*U;return W}}class B$ extends _7{constructor(J,$,Q,Z){super(J,$,Q,Z)}interpolate_(J){return this.copySampleValue_(J-1)}}class s0{constructor(J,$,Q,Z){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if($===void 0||$.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=a7($,this.TimeBufferType),this.values=a7(Q,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON(J){let $=J.constructor,Q;if($.toJSON!==this.toJSON)Q=$.toJSON(J);else{Q={name:J.name,times:a7(J.times,Array),values:a7(J.values,Array)};let Z=J.getInterpolation();if(Z!==J.DefaultInterpolation)Q.interpolation=Z}return Q.type=J.ValueTypeName,Q}InterpolantFactoryMethodDiscrete(J){return new B$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new M$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new O$(this.times,this.values,this.getValueSize(),J)}setInterpolation(J){let $;switch(J){case 2300:$=this.InterpolantFactoryMethodDiscrete;break;case 2301:$=this.InterpolantFactoryMethodLinear;break;case 2302:$=this.InterpolantFactoryMethodSmooth;break}if($===void 0){let Q="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(Q);return console.warn("THREE.KeyframeTrack:",Q),this}return this.createInterpolant=$,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let $=this.times;for(let Q=0,Z=$.length;Q!==Z;++Q)$[Q]+=J}return this}scale(J){if(J!==1){let $=this.times;for(let Q=0,Z=$.length;Q!==Z;++Q)$[Q]*=J}return this}trim(J,$){let Q=this.times,Z=Q.length,W=0,Y=Z-1;while(W!==Z&&Q[W]<J)++W;while(Y!==-1&&Q[Y]>$)--Y;if(++Y,W!==0||Y!==Z){if(W>=Y)Y=Math.max(Y,1),W=Y-1;let K=this.getValueSize();this.times=Q.slice(W,Y),this.values=this.values.slice(W*K,Y*K)}return this}validate(){let J=!0,$=this.getValueSize();if($-Math.floor($)!==0)console.error("THREE.KeyframeTrack: Invalid value size in track.",this),J=!1;let Q=this.times,Z=this.values,W=Q.length;if(W===0)console.error("THREE.KeyframeTrack: Track is empty.",this),J=!1;let Y=null;for(let K=0;K!==W;K++){let X=Q[K];if(typeof X==="number"&&isNaN(X)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,K,X),J=!1;break}if(Y!==null&&Y>X){console.error("THREE.KeyframeTrack: Out of order keys.",this,K,X,Y),J=!1;break}Y=X}if(Z!==void 0){if(mY(Z))for(let K=0,X=Z.length;K!==X;++K){let G=Z[K];if(isNaN(G)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,K,G),J=!1;break}}}return J}optimize(){let J=this.times.slice(),$=this.values.slice(),Q=this.getValueSize(),Z=this.getInterpolation()===2302,W=J.length-1,Y=1;for(let K=1;K<W;++K){let X=!1,G=J[K],U=J[K+1];if(G!==U&&(K!==1||G!==J[0]))if(!Z){let V=K*Q,H=V-Q,q=V+Q;for(let D=0;D!==Q;++D){let A=$[V+D];if(A!==$[H+D]||A!==$[q+D]){X=!0;break}}}else X=!0;if(X){if(K!==Y){J[Y]=J[K];let V=K*Q,H=Y*Q;for(let q=0;q!==Q;++q)$[H+q]=$[V+q]}++Y}}if(W>0){J[Y]=J[W];for(let K=W*Q,X=Y*Q,G=0;G!==Q;++G)$[X+G]=$[K+G];++Y}if(Y!==J.length)this.times=J.slice(0,Y),this.values=$.slice(0,Y*Q);else this.times=J,this.values=$;return this}clone(){let J=this.times.slice(),$=this.values.slice(),Z=new this.constructor(this.name,J,$);return Z.createInterpolant=this.createInterpolant,Z}}s0.prototype.TimeBufferType=Float32Array;s0.prototype.ValueBufferType=Float32Array;s0.prototype.DefaultInterpolation=2301;class Z7 extends s0{constructor(J,$,Q){super(J,$,Q)}}Z7.prototype.ValueTypeName="bool";Z7.prototype.ValueBufferType=Array;Z7.prototype.DefaultInterpolation=2300;Z7.prototype.InterpolantFactoryMethodLinear=void 0;Z7.prototype.InterpolantFactoryMethodSmooth=void 0;class A$ extends s0{}A$.prototype.ValueTypeName="color";class L$ extends s0{}L$.prototype.ValueTypeName="number";class _$ extends _7{constructor(J,$,Q,Z){super(J,$,Q,Z)}interpolate_(J,$,Q,Z){let W=this.resultBuffer,Y=this.sampleValues,K=this.valueSize,X=(Q-$)/(Z-$),G=J*K;for(let U=G+K;G!==U;G+=4)S6.slerpFlat(W,0,Y,G-K,Y,G,X);return W}}class O9 extends s0{InterpolantFactoryMethodLinear(J){return new _$(this.times,this.values,this.getValueSize(),J)}}O9.prototype.ValueTypeName="quaternion";O9.prototype.InterpolantFactoryMethodSmooth=void 0;class W7 extends s0{constructor(J,$,Q){super(J,$,Q)}}W7.prototype.ValueTypeName="string";W7.prototype.ValueBufferType=Array;W7.prototype.DefaultInterpolation=2300;W7.prototype.InterpolantFactoryMethodLinear=void 0;W7.prototype.InterpolantFactoryMethodSmooth=void 0;class z$ extends s0{}z$.prototype.ValueTypeName="vector";class k${constructor(J,$,Q){let Z=this,W=!1,Y=0,K=0,X=void 0,G=[];this.onStart=void 0,this.onLoad=J,this.onProgress=$,this.onError=Q,this.itemStart=function(U){if(K++,W===!1){if(Z.onStart!==void 0)Z.onStart(U,Y,K)}W=!0},this.itemEnd=function(U){if(Y++,Z.onProgress!==void 0)Z.onProgress(U,Y,K);if(Y===K){if(W=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(U){if(Z.onError!==void 0)Z.onError(U)},this.resolveURL=function(U){if(X)return X(U);return U},this.setURLModifier=function(U){return X=U,this},this.addHandler=function(U,V){return G.push(U,V),this},this.removeHandler=function(U){let V=G.indexOf(U);if(V!==-1)G.splice(V,2);return this},this.getHandler=function(U){for(let V=0,H=G.length;V<H;V+=2){let q=G[V],D=G[V+1];if(q.global)q.lastIndex=0;if(q.test(U))return D}return null}}}var uY=new k$;class C${constructor(J){this.manager=J!==void 0?J:uY,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(J,$){let Q=this;return new Promise(function(Z,W){Q.load(J,Z,$,W)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}}C$.DEFAULT_MATERIAL_NAME="__DEFAULT";class E8 extends F0{constructor(J,$=1){super();this.isLight=!0,this.type="Light",this.color=new nJ(J),this.intensity=$}dispose(){}copy(J,$){return super.copy(J,$),this.color.copy(J.color),this.intensity=J.intensity,this}toJSON(J){let $=super.toJSON(J);if($.object.color=this.color.getHex(),$.object.intensity=this.intensity,this.groundColor!==void 0)$.object.groundColor=this.groundColor.getHex();if(this.distance!==void 0)$.object.distance=this.distance;if(this.angle!==void 0)$.object.angle=this.angle;if(this.decay!==void 0)$.object.decay=this.decay;if(this.penumbra!==void 0)$.object.penumbra=this.penumbra;if(this.shadow!==void 0)$.object.shadow=this.shadow.toJSON();if(this.target!==void 0)$.object.target=this.target.uuid;return $}}class M9 extends E8{constructor(J,$,Q){super(J,Q);this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(F0.DEFAULT_UP),this.updateMatrix(),this.groundColor=new nJ($)}copy(J,$){return super.copy(J,$),this.groundColor.copy(J.groundColor),this}}var r8=new K0,T5=new T,P5=new T;class w${constructor(J){this.camera=J,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new MJ(512,512),this.map=null,this.mapPass=null,this.matrix=new K0,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Z8,this._frameExtents=new MJ(1,1),this._viewportCount=1,this._viewports=[new U0(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(J){let $=this.camera,Q=this.matrix;T5.setFromMatrixPosition(J.matrixWorld),$.position.copy(T5),P5.setFromMatrixPosition(J.target.matrixWorld),$.lookAt(P5),$.updateMatrixWorld(),r8.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),this._frustum.setFromProjectionMatrix(r8),Q.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1),Q.multiply(r8)}getViewport(J){return this._viewports[J]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy(J){return this.camera=J.camera.clone(),this.intensity=J.intensity,this.bias=J.bias,this.radius=J.radius,this.mapSize.copy(J.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let J={};if(this.intensity!==1)J.intensity=this.intensity;if(this.bias!==0)J.bias=this.bias;if(this.normalBias!==0)J.normalBias=this.normalBias;if(this.radius!==1)J.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)J.mapSize=this.mapSize.toArray();return J.camera=this.camera.toJSON(!1).object,delete J.camera.matrix,J}}class I$ extends w${constructor(){super(new L7(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}}class F8 extends E8{constructor(J,$){super(J,$);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(F0.DEFAULT_UP),this.updateMatrix(),this.target=new F0,this.shadow=new I$}dispose(){this.shadow.dispose()}copy(J){return super.copy(J),this.target=J.target.clone(),this.shadow=J.shadow.clone(),this}}class B9 extends E8{constructor(J,$){super(J,$);this.isAmbientLight=!0,this.type="AmbientLight"}}class A9{constructor(J=!0){this.autoStart=J,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=S5(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let J=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let $=S5();J=($-this.oldTime)/1000,this.oldTime=$,this.elapsedTime+=J}return J}}function S5(){return performance.now()}var L9="\\[\\]\\.:\\/",lY=new RegExp("["+L9+"]","g"),_9="[^"+L9+"]",dY="[^"+L9.replace("\\.","")+"]",cY=/((?:WC+[\/:])*)/.source.replace("WC",_9),nY=/(WCOD+)?/.source.replace("WCOD",dY),sY=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",_9),oY=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",_9),iY=new RegExp("^"+cY+nY+sY+oY+"$"),aY=["material","materials","bones","map"];class T${constructor(J,$,Q){let Z=Q||$0.parseTrackName($);this._targetGroup=J,this._bindings=J.subscribe_($,Z)}getValue(J,$){this.bind();let Q=this._targetGroup.nCachedObjects_,Z=this._bindings[Q];if(Z!==void 0)Z.getValue(J,$)}setValue(J,$){let Q=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,W=Q.length;Z!==W;++Z)Q[Z].setValue(J,$)}bind(){let J=this._bindings;for(let $=this._targetGroup.nCachedObjects_,Q=J.length;$!==Q;++$)J[$].bind()}unbind(){let J=this._bindings;for(let $=this._targetGroup.nCachedObjects_,Q=J.length;$!==Q;++$)J[$].unbind()}}class $0{constructor(J,$,Q){this.path=$,this.parsedPath=Q||$0.parseTrackName($),this.node=$0.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,$,Q){if(!(J&&J.isAnimationObjectGroup))return new $0(J,$,Q);else return new $0.Composite(J,$,Q)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(lY,"")}static parseTrackName(J){let $=iY.exec(J);if($===null)throw Error("PropertyBinding: Cannot parse trackName: "+J);let Q={nodeName:$[2],objectName:$[3],objectIndex:$[4],propertyName:$[5],propertyIndex:$[6]},Z=Q.nodeName&&Q.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let W=Q.nodeName.substring(Z+1);if(aY.indexOf(W)!==-1)Q.nodeName=Q.nodeName.substring(0,Z),Q.objectName=W}if(Q.propertyName===null||Q.propertyName.length===0)throw Error("PropertyBinding: can not parse propertyName from trackName: "+J);return Q}static findNode(J,$){if($===void 0||$===""||$==="."||$===-1||$===J.name||$===J.uuid)return J;if(J.skeleton){let Q=J.skeleton.getBoneByName($);if(Q!==void 0)return Q}if(J.children){let Q=function(W){for(let Y=0;Y<W.length;Y++){let K=W[Y];if(K.name===$||K.uuid===$)return K;let X=Q(K.children);if(X)return X}return null},Z=Q(J.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,$){J[$]=this.targetObject[this.propertyName]}_getValue_array(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)J[$++]=Q[Z]}_getValue_arrayElement(J,$){J[$]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,$){this.resolvedProperty.toArray(J,$)}_setValue_direct(J,$){this.targetObject[this.propertyName]=J[$]}_setValue_direct_setNeedsUpdate(J,$){this.targetObject[this.propertyName]=J[$],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,$){this.targetObject[this.propertyName]=J[$],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=J[$++]}_setValue_array_setNeedsUpdate(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=J[$++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=J[$++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,$){this.resolvedProperty[this.propertyIndex]=J[$]}_setValue_arrayElement_setNeedsUpdate(J,$){this.resolvedProperty[this.propertyIndex]=J[$],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,$){this.resolvedProperty[this.propertyIndex]=J[$],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,$){this.resolvedProperty.fromArray(J,$)}_setValue_fromArray_setNeedsUpdate(J,$){this.resolvedProperty.fromArray(J,$),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,$){this.resolvedProperty.fromArray(J,$),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,$){this.bind(),this.getValue(J,$)}_setValue_unbound(J,$){this.bind(),this.setValue(J,$)}bind(){let J=this.node,$=this.parsedPath,Q=$.objectName,Z=$.propertyName,W=$.propertyIndex;if(!J)J=$0.findNode(this.rootNode,$.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(Q){let G=$.objectIndex;switch(Q){case"materials":if(!J.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===G){G=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[Q]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[Q]}if(G!==void 0){if(J[G]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[G]}}let Y=J[Z];if(Y===void 0){let G=$.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+G+"."+Z+" but it wasn't found.",J);return}let K=this.Versioning.None;if(this.targetObject=J,J.needsUpdate!==void 0)K=this.Versioning.NeedsUpdate;else if(J.matrixWorldNeedsUpdate!==void 0)K=this.Versioning.MatrixWorldNeedsUpdate;let X=this.BindingType.Direct;if(W!==void 0){if(Z==="morphTargetInfluences"){if(!J.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[W]!==void 0)W=J.morphTargetDictionary[W]}X=this.BindingType.ArrayElement,this.resolvedProperty=Y,this.propertyIndex=W}else if(Y.fromArray!==void 0&&Y.toArray!==void 0)X=this.BindingType.HasFromToArray,this.resolvedProperty=Y;else if(Array.isArray(Y))X=this.BindingType.EntireArray,this.resolvedProperty=Y;else this.propertyName=Z;this.getValue=this.GetterByBindingType[X],this.setValue=this.SetterByBindingTypeAndVersioning[X][K]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}$0.Composite=T$;$0.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};$0.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};$0.prototype.GetterByBindingType=[$0.prototype._getValue_direct,$0.prototype._getValue_array,$0.prototype._getValue_arrayElement,$0.prototype._getValue_toArray];$0.prototype.SetterByBindingTypeAndVersioning=[[$0.prototype._setValue_direct,$0.prototype._setValue_direct_setNeedsUpdate,$0.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[$0.prototype._setValue_array,$0.prototype._setValue_array_setNeedsUpdate,$0.prototype._setValue_array_setMatrixWorldNeedsUpdate],[$0.prototype._setValue_arrayElement,$0.prototype._setValue_arrayElement_setNeedsUpdate,$0.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[$0.prototype._setValue_fromArray,$0.prototype._setValue_fromArray_setNeedsUpdate,$0.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var WK=new Float32Array(1);var y5=new K0;class z9{constructor(J,$,Q=0,Z=1/0){this.ray=new W9(J,$),this.near=Q,this.far=Z,this.camera=null,this.layers=new Q8,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,$){this.ray.set(J,$)}setFromCamera(J,$){if($.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition($.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject($).sub(this.ray.origin).normalize(),this.camera=$;else if($.isOrthographicCamera)this.ray.origin.set(J.x,J.y,($.near+$.far)/($.near-$.far)).unproject($),this.ray.direction.set(0,0,-1).transformDirection($.matrixWorld),this.camera=$;else console.error("THREE.Raycaster: Unsupported camera type: "+$.type)}setFromXRController(J){return y5.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(y5),this}intersectObject(J,$=!0,Q=[]){return $9(J,this,Q,$),Q.sort(v5),Q}intersectObjects(J,$=!0,Q=[]){for(let Z=0,W=J.length;Z<W;Z++)$9(J[Z],this,Q,$);return Q.sort(v5),Q}}function v5(J,$){return J.distance-$.distance}function $9(J,$,Q,Z){let W=!0;if(J.layers.test($.layers)){if(J.raycast($,Q)===!1)W=!1}if(W===!0&&Z===!0){let Y=J.children;for(let K=0,X=Y.length;K<X;K++)$9(Y[K],$,Q,!0)}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"170"}}));if(typeof window<"u")if(window.__THREE__)console.warn("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="170";var n={sky:12175058,grass:8229992,grassDark:6979672,concrete:10133928,concreteDark:8357517,kerb:11910339,asphalt:4936282,gravel:9211794,pipe:5008006,pipeDark:3888493,flange:3095367,steel:11844804,steelDark:8160912,gunmetal:4015696,navy:2244714,wall:14146012,wallDark:12172996,roof:5857385,glass:10274024,door:2896956,van:15790836,vanTrim:2244714,tyre:1843236,water:3779048,waterGlow:7327999,red:14174011,amber:15180347,green:3781499,grey:9148065,gold:14266943,dirt:7230008,trench:3023897,barrier:14715439,smoke:14673128},D8={red:n.red,amber:n.amber,green:n.green,grey:n.grey},R8=new T(58,57,58),P$=new Map;function v6(J,$,Q,Z=1){let W=P$.get(J);if(W)return W;let Y=document.createElement("canvas");Y.width=Y.height=$;let K=Y.getContext("2d");Q(K,$);let X=new X8(Y);return X.wrapS=X.wrapT=g5,X.repeat.set(Z,Z),X.colorSpace=J8,X.anisotropy=8,P$.set(J,X),X}function X7(J,$,Q,Z){J.fillStyle=Q,J.fillRect(0,0,$,$);let W=J.getImageData(0,0,$,$),Y=W.data;for(let K=0;K<Y.length;K+=4){let X=(Math.random()-0.5)*Z;Y[K]+=X,Y[K+1]+=X,Y[K+2]+=X}J.putImageData(W,0,0)}var Y6=()=>v6("concrete",256,(J,$)=>{X7(J,$,"#e2e5e8",26),J.strokeStyle="rgba(0,0,0,0.18)",J.lineWidth=2,J.strokeRect(1,1,$-2,$-2)},8),tY=()=>v6("grass",256,(J,$)=>{X7(J,$,"#dfe6d8",34);for(let Q=0;Q<400;Q++)J.fillStyle=`rgba(0,0,0,${Math.random()*0.08})`,J.fillRect(Math.random()*$,Math.random()*$,2,3)},24),eY=()=>v6("asphalt",256,(J,$)=>X7(J,$,"#d8dbde",30),10),JK=()=>v6("steel",128,(J,$)=>{X7(J,$,"#e6e9ec",14);for(let Q=0;Q<$;Q+=3)J.fillStyle=`rgba(255,255,255,${Math.random()*0.07})`,J.fillRect(Q,0,1,$)},2),$K=()=>v6("paint",128,(J,$)=>{X7(J,$,"#e8eaec",10);for(let Q=0;Q<40;Q++)J.fillStyle=`rgba(0,0,0,${Math.random()*0.06})`,J.fillRect(Math.random()*$,Math.random()*$,6,2)},3),N8=()=>v6("roof",128,(J,$)=>{X7(J,$,"#e0e3e6",12);for(let Q=0;Q<$;Q+=16)J.fillStyle="rgba(0,0,0,0.28)",J.fillRect(Q,0,2,$),J.fillStyle="rgba(255,255,255,0.08)",J.fillRect(Q+8,0,1,$)},3),w9=(J,$)=>v6(J,128,(Q,Z)=>{let W=Q.createRadialGradient(Z/2,Z/2,0,Z/2,Z/2,Z/2);$.forEach(([Y,K])=>W.addColorStop(Y,K)),Q.fillStyle=W,Q.fillRect(0,0,Z,Z)}),k9=()=>w9("glow",[[0,"rgba(255,255,255,0.95)"],[0.35,"rgba(255,255,255,0.3)"],[1,"rgba(255,255,255,0)"]]),QK=()=>w9("drop",[[0,"rgba(220,240,255,0.95)"],[0.5,"rgba(120,190,240,0.5)"],[1,"rgba(120,190,240,0)"]]),S$=()=>w9("steam",[[0,"rgba(255,255,255,0.55)"],[1,"rgba(255,255,255,0)"]]);function K6(J,$){let Z=document.createElement("canvas");Z.width=Math.round($.w*28),Z.height=Math.round($.h*28);let W=Z.getContext("2d");W.fillStyle=$.bg??"#101418",W.fillRect(0,0,Z.width,Z.height),W.strokeStyle="rgba(255,255,255,0.15)",W.lineWidth=2,W.strokeRect(1,1,Z.width-2,Z.height-2),W.fillStyle=$.color??"#8fdcff",W.textAlign="center",W.textBaseline="middle";let Y=($.font??$.h*0.5)*28;W.font=`600 ${Y}px ${$.mono?"ui-monospace, Menlo, monospace":"-apple-system, Inter, Helvetica, Arial, sans-serif"}`;let K=J.split(`
`);K.forEach((G,U)=>W.fillText(G,Z.width/2,Z.height/2+(U-(K.length-1)/2)*Y*1.2));let X=new X8(Z);return X.colorSpace=J8,X.anisotropy=8,new PJ(new Z6($.w,$.h),new M6({map:X,toneMapped:!1}))}var R0=(J,$={})=>new q8({color:J,roughness:0.7,metalness:0.12,...$}),p0=(J)=>R0(J,{roughness:0.45,metalness:0.35,map:$K()}),Y7=(J=n.steel)=>R0(J,{roughness:0.38,metalness:0.8,map:JK()}),B6=(J,$=1.6)=>new q8({color:J,emissive:J,emissiveIntensity:$,roughness:0.4,metalness:0}),K7=(J,$,Q,Z=!1)=>new E9(new K8({map:J,color:$,transparent:!0,opacity:Q,depthWrite:!1,blending:Z?b5:h5}));function ZK(J){let $=J.replace(/^hair transplant\s*/i,"").replace(/\s+[-–—]\s+/g," · ").trim()||J;return $.length>26?$.slice(0,25).trimEnd()+"…":$}class I9{renderer;scene=new q9;camera;container;opts;raf=0;clock=new A9;world=new Z0;scenery=new Z0;fx=new Z0;pickables=[];flows=[];fills=[];tankFills=new Map;tankPanels=new Map;leaks=[];beacons=[];steams=[];spins=[];halos=[];digs=[];vans=new Map;trips=[];puffs=[];tankPos=new Map;roadZ=40;clinicRoadX=0;labelAnchors=[];hovered=null;sun;raycaster=new z9;pointer=new MJ(-2,-2);disposed=!1;zoom=1;zoomTarget=1;baseFs=60;center=new T;constructor(J,$={}){this.container=J,this.opts=$,this.renderer=new V9({antialias:!0,alpha:!1,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=j5,this.renderer.toneMapping=x5,this.renderer.toneMappingExposure=1.1,this.renderer.outputColorSpace=J8,J.appendChild(this.renderer.domElement),this.renderer.domElement.style.display="block",this.camera=new L7(-1,1,1,-1,-400,800),this.camera.position.copy(R8),this.camera.lookAt(0,0,0),this.scene.background=new nJ(n.sky),this.scene.fog=new Y8(n.sky,320,620),this.scene.add(new M9(14674677,5597514,1.15)),this.scene.add(new B9(16777215,0.35)),this.sun=new F8(16773597,2.4),this.sun.position.set(70,100,30),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(4096,4096),Object.assign(this.sun.shadow.camera,{left:-230,right:230,top:230,bottom:-230,near:1,far:500}),this.sun.shadow.bias=-0.0004,this.sun.shadow.normalBias=0.03,this.sun.shadow.radius=3,this.scene.add(this.sun);let Q=new F8(12572415,0.5);Q.position.set(-60,40,-80),this.scene.add(Q),this.scene.add(this.world,this.scenery,this.fx),this.buildGround(),this.renderer.domElement.addEventListener("pointermove",this.onMove),this.renderer.domElement.addEventListener("click",this.onClick),window.addEventListener("resize",this.resize),this.resize(),this.loop()}setTown(J){this.clearTown(),this.setNight(J.hour<7||J.hour>=19);let $=this.world,Q=(I)=>I===null?"—":`$${Math.round(I).toLocaleString()}`,Z=(I,FJ)=>I?"Weak":FJ?"Strong":"Steady",W=J.towers.length>6?3:2,Y=Math.max(1,Math.ceil(J.towers.length/W)),K={x:-118-(W-2)*26,z:-44,w:22+W*26,d:Math.max(88,18+Y*28)};this.plinth(K.x,K.z,K.w,K.d,"ACQUISITION PLANT");let X=K.x+K.w-6,G=K.z+8,U=K.z+K.d-8;this.pipe([[X,2,G],[X,2,U]],1.3);let V=Math.max(1,J.towers.reduce((I,FJ)=>I+FJ.leads,0));J.towers.forEach((I,FJ)=>{let kJ=FJ%W,BJ=Math.floor(FJ/W),XJ=K.x+14+kJ*26,yJ=K.z+16+BJ*28,P=new Z0;P.position.set(XJ,0.6,yJ);let lJ=9,zJ=4.6,vJ=6;for(let[u,TJ]of[[-2.8,-2.8],[2.8,-2.8],[-2.8,2.8],[2.8,2.8]])P.add(this.box(0.55,lJ,0.55,n.gunmetal,u,0,TJ,{metalness:0.6,roughness:0.5}));for(let u of[3,6.5])P.add(this.box(6.2,0.3,0.3,n.gunmetal,0,u,-2.8)),P.add(this.box(6.2,0.3,0.3,n.gunmetal,0,u,2.8)),P.add(this.box(0.3,0.3,6.2,n.gunmetal,-2.8,u,0)),P.add(this.box(0.3,0.3,6.2,n.gunmetal,2.8,u,0));P.add(this.cyl(zJ+0.4,0.5,n.gunmetal,0,lJ,0));let UJ=new PJ(new B0(zJ,zJ,vJ,40),p0(n.navy));UJ.position.y=lJ+0.5+vJ/2,UJ.castShadow=!0,P.add(UJ);for(let u of[0.2,0.8])P.add(this.ring(zJ+0.06,0.12,n.steel,0,lJ+0.5+vJ*u,0));let dJ=new PJ(new W6(zJ,40,12,0,Math.PI*2,0,Math.PI/2),Y7(n.steelDark));dJ.scale.y=0.4,dJ.position.y=lJ+0.5+vJ,dJ.castShadow=!0,P.add(dJ),P.add(this.ring(zJ+1,0.1,n.gunmetal,0,lJ+1.4,0));for(let u=0;u<14;u++){let TJ=u/14*Math.PI*2;P.add(this.box(0.07,1,0.07,n.gunmetal,Math.cos(TJ)*(zJ+1),lJ+0.5,Math.sin(TJ)*(zJ+1)))}P.add(this.box(0.7,vJ-0.8,0.4,n.gunmetal,-zJ*0.7,lJ+0.9,zJ*0.7));let NJ=new PJ(new T0(0.4,0.01,0.2),B6(n.waterGlow,1.6));NJ.position.set(-zJ*0.7,lJ+1.1,zJ*0.7+0.2),P.add(NJ),this.fills.push({water:NJ,target:Math.max(0.05,I.fill),maxH:vJ-1.2,base:lJ+1.1}),P.add(this.box(7,0.5,4,n.concreteDark,5.5,0,5.5,{map:Y6()}));let WJ=new PJ(new B0(1.1,1.1,3.2,24),p0(n.pipe));WJ.rotation.z=Math.PI/2,WJ.position.set(4.6,1.6,5.5),WJ.castShadow=!0,P.add(WJ);let z=new PJ(new B0(0.9,0.9,2.2,24),p0(3817285));z.rotation.z=Math.PI/2,z.position.set(7.3,1.6,5.5),P.add(z);let R=new PJ(new g0(0.55,0.12,6,18),Y7());if(R.rotation.y=Math.PI/2,R.position.set(8.5,1.6,5.5),P.add(R),!I.fire&&I.leads>0)this.spins.push({mesh:R,speed:I.star?14:6});P.add(this.gauge(4.6,3.4,5.5,I.fire?"red":I.star?"green":"grey")),P.add(this.valve(8.6,2,3.2,!I.fire&&I.leads===0)),P.add(this.cyl(0.55,lJ-1,n.pipe,0,0.5,zJ+0.3)),this.pipe([[XJ,2,yJ+zJ+0.3],[XJ,2,yJ+5.5],[XJ+4.6,2,yJ+5.5]],0.55,!1);let h=this.pipe([[XJ+10,2,yJ+5.5],[X-4,2,yJ+5.5],[X,2,yJ+5.5]],0.8);this.valveOnPipe(XJ+12.5,2,yJ+5.5,0.8);let i=I.leads/V,t=I.fire?1:Math.max(1,Math.round(i*10));for(let u=0;u<t;u++)this.addFlow(h,u/t,I.star?0.32:I.fire?0.05:0.16,0.8);if(P.add(this.light(0,lJ+0.5+vJ+2.4,0,D8[I.tone],I.tone!=="grey")),I.fire)this.addLeak(new T(XJ+12.5,2,yJ+5.5),new T(0,-1,0.6)),this.addBeacon(new T(XJ+5.5,2.9,yJ+3.6),n.red);if(I.star)this.addHalo(new T(XJ,0.62,yJ),zJ+2.6);this.tag(P,{kind:"tower",id:I.id}),$.add(P),this.labelAnchors.push({key:`tower:${I.id}`,pos:new T(XJ,lJ+vJ+4.6+BJ%2*3,yJ),short:ZK(I.name),title:I.name,tone:I.tone,kind:"tower",kpis:[["Leads",String(I.leads)],["CPL",Q(I.costPerLead)],["Bookings",String(I.booked)],["Cost / showed",Q(I.costPerShow)],["Trend",I.costTrend===null?"n/a":`${I.costTrend>=1?"+":"−"}${Math.round(Math.abs(I.costTrend-1)*100)}% CPL`],["Performance",Z(I.fire,I.star)]]})});let H={x:K.x+K.w+16,z:-44,w:22+Math.max(1,J.bays.length)*20,d:Math.max(88,K.d)},q=K.z+K.d/2,D=new T(K.x+K.w+10,0.6,q),A=this.pipe([[X,2,q],[D.x-6,2,q]],1.3),O=this.pipe([[D.x+6,2,q],[H.x-4,2,q],[H.x-4,2,H.z+14],[H.x+6,2,H.z+14]],1.3),F=Math.max(2,Math.min(14,Math.round(V/8)));for(let I=0;I<F;I++)this.addFlow(A,I/F,0.25,1.3),this.addFlow(O,I/F,0.12,1.3);let E=new Z0;E.position.copy(D),E.add(this.box(12,0.6,10,n.concreteDark,0,0,0,{map:Y6()}));let _=new PJ(new B0(2.2,2.2,8,28),p0(n.pipe));_.rotation.z=Math.PI/2,_.position.set(0,2.6,0),_.castShadow=!0,E.add(_),E.add(this.ring(2.35,0.2,n.flange,-3.2,2.6,0,!0)),E.add(this.ring(2.35,0.2,n.flange,3.2,2.6,0,!0));let N=new PJ(new B0(1.6,1.6,3,24),p0(3817285));N.rotation.x=Math.PI/2,N.position.set(0,2.6,5),E.add(N);let C=new PJ(new g0(1,0.18,6,18),Y7());if(C.position.set(0,2.6,6.6),E.add(C),!J.pump.fire)this.spins.push({mesh:C,speed:8});if(E.add(this.gauge(-3.8,5.2,3.2,J.pump.fire?"red":"green")),E.add(this.box(0.4,4,0.4,n.gunmetal,4.5,0.6,-3.5)),E.add(this.light(4.5,5,-3.5,J.pump.fire?n.red:n.green,!0)),this.tag(E,{kind:"pump",id:"pump"}),$.add(E),J.pump.fire)this.addBeacon(new T(D.x,5.4,D.z-3),n.red),this.addSteam(new T(D.x+3.4,4.6,D.z));this.labelAnchors.push({key:"pump:pump",pos:new T(D.x,9,D.z),short:"Main pump",title:"Main pump · automations",tone:J.pump.fire?"red":"grey",kind:"pump",kpis:J.pump.issues.length?J.pump.issues.map((I,FJ)=>[`Issue ${FJ+1}`,I]):[["Leads webhook","Flowing"],["Reminder texts","Sending"]]}),this.plinth(H.x,H.z,H.w,H.d,"ADVISOR DEPOT");let f=Math.max(1,J.bays.length),k=H.w-12,w=20,b=H.x+H.w/2,B=H.z+12,L=new Z0;L.position.set(b,0.6,B),L.add(this.box(k,10,w,n.wall,0,0,0,{map:Y6(),roughness:0.85})),L.add(this.box(k+1,0.7,w+1,n.roof,0,10,0,{map:N8(),metalness:0.4,roughness:0.5}));for(let I=0;I<Math.floor(k/9);I++)L.add(this.box(5,0.5,4,n.glass,-k/2+6+I*9,10.7,-2,{transparent:!0,opacity:0.6,roughness:0.1,metalness:0.3}));L.add(this.box(k+1,1.6,0.5,n.navy,0,8,w/2+0.3));let S=K6("ADVISOR DEPOT · WAREHOUSE",{w:16,h:1.3,font:0.8,color:"#eef2f6",bg:"#22406a"});S.position.set(0,8.8,w/2+0.6),L.add(S),J.bays.forEach((I,FJ)=>{let kJ=-k/2+10+FJ*20;L.add(this.box(8,6.5,0.4,n.door,kJ,0,w/2+0.05));for(let BJ=1;BJ<7;BJ++)L.add(this.box(8,0.06,0.12,n.steelDark,kJ,BJ,w/2+0.3));L.add(this.light(kJ,7.2,w/2+0.4,I.inSession?n.green:n.grey,I.inSession))}),this.tag(L,{kind:"depot",id:"depot"}),$.add(L),this.labelAnchors.push({key:"depot",pos:new T(b,14,B-4),short:"Depot warehouse",title:"Advisor depot",tone:"grey",kind:"depot",kpis:[["Leads in the yard",J.yardLeads.toLocaleString()],["Advisors online",String(J.bays.filter((I)=>I.inSession).length)],["Booked today",String(J.todayBooked)],["Showed today",String(J.todayShowed)]]});let x=B+w/2+4;this.pipe([[H.x+6,2,H.z+14],[H.x+6,2,x],[H.x+H.w-6,2,x]],1.1);let l=x+26;this.roadZ=H.z+H.d+10;let s=this.pipe([[H.x+6,2,l],[H.x+H.w-4,2,l]],1.1);J.bays.forEach((I,FJ)=>{let kJ=b-k/2+10+FJ*20,BJ=x+12,XJ=new Z0;XJ.position.set(kJ,0.6,BJ),XJ.add(this.box(12,0.6,9,n.concreteDark,0,0,0,{map:Y6()}));for(let WJ of[-2.6,2.6]){let z=new PJ(new B0(1.2,1.2,4.2,24),p0(n.pipe));z.rotation.x=Math.PI/2,z.position.set(WJ,1.9,0),z.castShadow=!0,XJ.add(z);let R=new PJ(new B0(0.9,0.9,2,20),p0(3817285));R.rotation.x=Math.PI/2,R.position.set(WJ,1.9,3.2),XJ.add(R);let h=new PJ(new g0(0.5,0.1,6,16),Y7());if(h.position.set(WJ,1.9,4.3),XJ.add(h),I.inSession)this.spins.push({mesh:h,speed:I.star?16:I.fire?3:8})}XJ.add(this.box(1.2,4.5,2.2,3817285,5,0.6,-2.4,{metalness:0.5,roughness:0.4})),XJ.add(this.gauge(5,3.6,-1.25,I.fire?"red":I.star?"green":I.inSession?"grey":"grey")),XJ.add(this.light(5,5.6,-2.4,D8[I.tone],I.tone!=="grey"||I.inSession));let yJ=1.6,P=5;XJ.add(this.cyl(yJ,P,n.steelDark,-5,0.6,-2.5,{},!0)),XJ.add(this.box(0.6,P-0.6,0.35,n.gunmetal,-5+yJ*0.7,0.9,-2.5+yJ*0.7));let lJ=new PJ(new T0(0.34,0.01,0.18),B6(I.fire?n.amber:n.waterGlow,1.6));lJ.position.set(-5+yJ*0.7,0.9,-2.5+yJ*0.7+0.18),XJ.add(lJ),this.fills.push({water:lJ,target:I.fire?0.95:I.inSession?0.3:0.1,maxH:P-1,base:0.9});let zJ=this.pipe([[kJ,2,x],[kJ,2,BJ-4.6]],0.8);this.valveOnPipe(kJ,2,x+5,0.8);let vJ=this.pipe([[kJ,2,BJ+4.6],[kJ,2,l]],0.8),UJ=I.inSession?I.star?6:I.fire?2:4:1;for(let WJ=0;WJ<UJ;WJ++)this.addFlow(zJ,WJ/UJ,I.inSession?0.4:0.08,0.8),this.addFlow(vJ,WJ/UJ,I.star?0.5:I.fire?0.06:0.25,0.8);if(I.fire){this.addSteam(new T(kJ-5,6.2,BJ-2.5)),this.addBeacon(new T(kJ+5,5.6,BJ-2.4),n.red);for(let WJ=0;WJ<6;WJ++)this.addFlow(zJ,WJ/6,0.03,0.8)}if(I.star)this.addHalo(new T(kJ,0.62,BJ),8);this.tag(XJ,{kind:"bay",id:I.repId}),$.add(XJ);let dJ=this.makeVan(I.fire?n.red:I.star?n.green:n.van,I.inSession,I.name),NJ=new T(kJ+11,0.6,BJ+4);if(I.inSession){let WJ=new T(kJ+11,0.6,BJ+12),z=this.box(7,0.4,3.5,n.trench,WJ.x,-0.35,WJ.z);$.add(z);let R=new PJ(new W6(2,16,10,0,Math.PI*2,0,Math.PI/2),R0(n.dirt,{roughness:1}));R.scale.set(1.5,0.6,1),R.position.set(WJ.x+5.5,0.6,WJ.z),R.castShadow=!0,$.add(R);for(let t of[-4.4,4.4])$.add(this.box(0.2,1,3.8,n.barrier,WJ.x+t,0.6,WJ.z)),$.add(this.box(0.2,0.1,3.8,16777215,WJ.x+t,1.25,WJ.z));let h=new Z0;h.position.set(WJ.x-4,2.2,WJ.z-3.5),h.add(this.box(0.5,0.5,4.6,n.amber,0,0,2.3));let i=new Z0;i.position.set(0,0,4.6),i.add(this.box(0.5,0.5,2.6,n.amber,0,-1.3,0)),i.add(this.box(1.3,0.9,1.1,n.gunmetal,0,-2.8,0)),h.add(i),$.add(this.box(2.2,1.8,2.4,n.amber,WJ.x-4,0.6,WJ.z-5.5)),$.add(this.box(2.6,0.7,3.2,n.tyre,WJ.x-4,0.6,WJ.z-5.5)),$.add(h),this.digs.push({site:WJ,boom:h,bucket:i,clods:[],next:Math.random()}),dJ.position.copy(NJ),dJ.rotation.y=Math.PI/2}else dJ.position.copy(NJ),dJ.rotation.y=Math.PI;$.add(dJ),this.vans.set(I.repId,{group:dJ,home:NJ.clone(),rot:dJ.rotation.y,busy:!1}),this.labelAnchors.push({key:`bay:${I.repId}`,pos:new T(kJ,8.6,BJ),short:I.name,title:`${I.name} · advisor station`,tone:I.tone,kind:"bay",kpis:[["Status",I.inSession?"On the tools":"Off"],["Today",`${I.callsToday} calls · ${I.bookingsToday} booked`],["This week",`${I.bookings7d} booked in ${I.hours7d} h`],["Rate",I.rate7d===null?"—":`1 every ${(1/Math.max(0.01,I.rate7d)).toFixed(1)} h`],["Pressure",I.fire?"Backing up":I.star?"Clean, high":"Normal"]]})});let d={x:H.x+H.w+16,z:-44,w:96,d:88};this.plinth(d.x,d.z,d.w,d.d,"CLINIC DISTRICT"),this.clinicRoadX=d.x+d.w+12;let c=d.x+6,e=this.pipe([[H.x+H.w-4,2,l],[c,2,l],[c,2,d.z+10],[c,2,d.z+d.d-10]],1.1);for(let I=0;I<Math.min(8,J.todayBooked+2);I++)this.addFlow(e,I/8,0.1,1.1);J.tanks.forEach((I,FJ)=>{let kJ=FJ%2,BJ=Math.floor(FJ/2),XJ=d.x+24+kJ*42,yJ=d.z+20+BJ*34,P=new Z0;P.position.set(XJ,0.6,yJ),P.add(this.box(18,9,12,n.wall,0,0,0,{map:Y6(),roughness:0.85})),P.add(this.box(18.6,0.5,12.6,n.roof,0,9,0,{map:N8(),metalness:0.4})),P.add(this.box(16,3.2,0.4,n.glass,0,4.6,6.05,{transparent:!0,opacity:0.65,roughness:0.08,metalness:0.3})),P.add(this.box(16,2.6,0.4,n.glass,0,0.8,6.05,{transparent:!0,opacity:0.65,roughness:0.08,metalness:0.3})),P.add(this.box(3.2,3.2,0.5,n.door,0,0,6.1)),P.add(this.box(18,0.5,2.5,n.wallDark,0,3.6,7)),P.add(this.box(3,1.4,3,n.steelDark,-5,9.5,-2)),P.add(this.box(3,1.4,3,n.steelDark,5,9.5,-2));let lJ=K6(I.name.toUpperCase(),{w:12,h:1.4,font:0.7,color:"#eef2f6",bg:"#22406a"});lJ.position.set(0,8,6.4),P.add(lJ),P.add(this.box(1.4,0.4,0.3,n.green,0,6.9,6.4)),P.add(this.box(0.4,1.4,0.3,n.green,0,6.4,6.4));let zJ=3.4,vJ=8;P.add(this.cyl(zJ+0.8,0.6,n.concreteDark,14.5,0,0,{map:Y6()})),P.add(this.cyl(zJ,vJ,n.steel,14.5,0.6,0,{},!0));for(let z of[0.33,0.66])P.add(this.ring(zJ+0.06,0.12,n.steelDark,14.5,0.6+vJ*z,0));P.add(this.cyl(zJ+0.12,0.5,n.steelDark,14.5,0.6+vJ,0)),P.add(this.box(0.9,vJ-0.6,0.5,n.gunmetal,14.5-zJ*0.72,0.9,zJ*0.72));let UJ=new PJ(new T0(0.42,0.01,0.22),B6(I.fill>=1?n.amber:n.waterGlow,1.8));UJ.position.set(14.5-zJ*0.72,1.1,zJ*0.72+0.24),P.add(UJ);let dJ={water:UJ,target:Math.max(0.02,I.fill),maxH:vJ-1.1,base:1.1};this.fills.push(dJ),this.tankFills.set(I.clinicId,dJ);let NJ=new Z0;NJ.position.set(14.5,0.6+vJ+2.6,0),NJ.rotation.y=Math.PI/4,P.add(NJ),this.tankPanels.set(I.clinicId,NJ),this.paintTankPanel(I.clinicId,I.delivered,I.packSize),P.add(this.valve(9.2,2,-3.5,I.fill>=1)),P.add(this.light(14.5,0.6+vJ+1.2,0,I.fill>=1?n.amber:D8[I.tone],I.fill>=1||I.tone!=="grey"));let WJ=this.pipe([[c,2,yJ-3.5],[XJ+9.2,2,yJ-3.5],[XJ+14.5,2,yJ-3.5],[XJ+14.5,2,yJ-zJ]],0.7);if(I.fill<1)for(let z=0;z<2;z++)this.addFlow(WJ,z/2,0.15,0.7);if(this.tag(P,{kind:"tank",id:I.clinicId}),$.add(P),this.tankPos.set(I.clinicId,new T(XJ+14.5,0.6,yJ+6)),I.fire)this.addBeacon(new T(XJ,10.2,yJ),n.amber);this.labelAnchors.push({key:`tank:${I.clinicId}`,pos:new T(XJ,12.2,yJ),short:I.name,title:I.name,tone:I.tone,kind:"tank",kpis:[["Pack",String(I.packSize)],["Delivered",String(I.delivered)],["Remaining",String(I.owed)],["Tank",`${I.pct}%`],["Valve",I.fill>=1?"Closed · full":"Open"],...I.refundFails?[["Refunds failed",`${I.refundFails} · ${I.refundNames.join(", ")}`]]:[]]})});let m={x:H.x,z:H.z+H.d+22,w:H.w+30,d:42};this.plinth(m.x,m.z,m.w,m.d,"METER STATION");let YJ=m.x+22,GJ=m.z+m.d/2+2,wJ=new Z0;wJ.position.set(YJ,0.6,GJ),wJ.add(this.box(22,7,14,n.wall,0,0,0,{map:Y6(),roughness:0.85})),wJ.add(this.box(22.6,0.6,14.6,n.roof,0,7,0,{map:N8(),metalness:0.4}));for(let I=0;I<3;I++)wJ.add(this.cyl(1.2,3.5,n.steelDark,-7+I*7,7.3,-3,{},!0));let pJ=new PJ(new B0(3,3,0.6,40),p0(2830648));pJ.rotation.x=Math.PI/2,pJ.position.set(-5,4,7.3),wJ.add(pJ);let o=this.box(0.25,2.4,0.2,n.red,-5,4,7.65);o.rotation.z=J.profit>=0?-0.9:0.9,wJ.add(o);let JJ=K6(`${J.rangeLabel.toUpperCase()}   IN $${Math.round(J.totalRevenue).toLocaleString()}   OUT $${Math.round(J.totalCost).toLocaleString()}`,{w:12,h:1.4,font:0.6,mono:!0,color:J.profit>=0?"#8ff0c8":"#ffc48a"});JJ.position.set(4.5,4.4,7.05),wJ.add(JJ);let IJ=K6("METER STATION · FINANCE",{w:12,h:1.2,font:0.7,color:"#eef2f6",bg:"#22406a"});IJ.position.set(4.5,6.2,7.05),wJ.add(IJ),this.tag(wJ,{kind:"meter",id:"meter"}),$.add(wJ);let SJ=this.pipe([[c,2,d.z+d.d-10],[c,2,m.z-6],[YJ+11,2,m.z-6],[YJ+11,2,GJ-7]],1.1);for(let I=0;I<Math.max(1,Math.min(8,Math.round(J.totalRevenue/800)));I++)this.addFlow(SJ,I/8,0.12,1.1);this.labelAnchors.push({key:"meter",pos:new T(YJ,12,GJ),short:"Meter station",title:`Meter station · ${J.rangeLabel}`,tone:J.profit>=0?"green":"amber",kind:"meter",kpis:[["Revenue",Q(J.totalRevenue)],["Cost",Q(J.totalCost)],["Net",`${J.profit<0?"−":"+"}${Q(Math.abs(J.profit))}`]]}),J.puddles.forEach((I,FJ)=>{let kJ=YJ+22+FJ*16,BJ=GJ+4,XJ=new Z0;XJ.position.set(kJ,0.6,BJ),XJ.add(this.box(4,4.2,2.4,3817285,0,0,0,{metalness:0.5,roughness:0.45})),XJ.add(this.gauge(0,3,1.25,I.star?"green":I.tone==="red"?"amber":"grey")),XJ.add(this.light(0,4.9,0,I.star?n.green:I.tone==="red"?n.amber:n.grey,I.tone!=="grey")),this.pipe([[YJ+11,2,GJ-4],[kJ,2,GJ-4],[kJ,2,BJ-1.2]],0.5);let yJ=K6(I.city.toUpperCase(),{w:4,h:0.9,font:0.5,color:"#eef2f6",bg:"#22406a"});if(yJ.position.set(0,1,1.22),XJ.add(yJ),this.tag(XJ,{kind:"puddle",id:I.city}),$.add(XJ),I.tone==="red")this.addLeak(new T(kJ+1.8,1.4,BJ+0.8),new T(0.6,-1,0.8));if(I.star)this.addHalo(new T(kJ,0.62,BJ),4);this.labelAnchors.push({key:`puddle:${I.city}`,pos:new T(kJ,7,BJ),short:I.city,title:`${I.city} · ${J.rangeLabel}`,tone:I.tone,kind:"puddle",kpis:[["Revenue",Q(I.revenue)],["Cost",Q(I.cost)],["Net",`${I.profit<0?"−":"+"}${Q(Math.abs(I.profit))}`],["Status",I.star?"Profitable":I.tone==="red"?"Leaking":"No shows yet"]]})}),C9(this.scenery,H.x-10,this.roadZ,this.clinicRoadX,this.roadZ,9),C9(this.scenery,this.clinicRoadX,this.roadZ,this.clinicRoadX,d.z-8,9);for(let[,I]of this.tankPos)C9(this.scenery,I.x+4,I.z+2,this.clinicRoadX,I.z+2,5);for(let[I,FJ]of[[H.x-8,this.roadZ-7],[H.x+H.w/2,this.roadZ-7],[this.clinicRoadX-7,this.roadZ-7],[this.clinicRoadX-7,d.z+24],[this.clinicRoadX-7,d.z+64]])this.lightPole(I,FJ);for(let[I,FJ]of[[K.x-8,K.z+12],[K.x-8,K.z+60],[d.x+d.w+20,d.z+4],[m.x+m.w+8,m.z+8],[K.x+20,K.z+K.d+10],[m.x-10,m.z+30]])this.tree(I,FJ);this.shippingContainer(H.x+H.w-20,H.z+4,n.navy),this.shippingContainer(H.x+H.w-20,H.z+8,9067066),this.shippingContainer(d.x+d.w-16,d.z+4,n.steelDark),this.fitCamera()}deliverBooking(J,$){let Q=J&&this.vans.get(J)||[...this.vans.values()].find((X)=>!X.busy)||null;if(!Q||Q.busy)return;let Z=$&&this.tankPos.has($)?$:[...this.tankPos.keys()][0],W=Z?this.tankPos.get(Z):null;if(!W||!Z)return;let Y=Q.group.position.clone(),K=[Y,new T(Y.x,0.6,this.roadZ),new T(this.clinicRoadX,0.6,this.roadZ),new T(this.clinicRoadX,0.6,W.z+2),new T(W.x+4,0.6,W.z+2)];Q.busy=!0,this.trips.push({van:Q,curve:new Q7(K,!1,"catmullrom",0.05),t:0,speed:0.2,phase:"out",clinicId:Z,crate:null,dropT:0,puffT:0})}setTankFill(J,$,Q){let Z=this.tankFills.get(J);if(Z)Z.target=Math.max(0.02,Q>0?Math.min(1,$/Q):0);this.paintTankPanel(J,$,Q)}focus(J){let $=J?J.kind==="depot"||J.kind==="meter"?J.kind:`${J.kind}:${J.id}`:null,Q=$?this.labelAnchors.find((W)=>W.key===$):null,Z=Q?new T(Q.pos.x,0,Q.pos.z):this.center.clone();this.camera.position.copy(Z).add(R8),this.camera.lookAt(Z),this.zoomTarget=J?0.6:1}dispose(){this.disposed=!0,cancelAnimationFrame(this.raf),window.removeEventListener("resize",this.resize),this.renderer.domElement.removeEventListener("pointermove",this.onMove),this.renderer.domElement.removeEventListener("click",this.onClick),this.clearTown(),this.renderer.dispose(),this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement)}setNight(J){this.sun.intensity=J?0.8:2.4,this.sun.color.set(J?10466528:16773597),this.scene.background=new nJ(J?2765892:n.sky),this.scene.fog.color.set(J?2765892:n.sky),this.renderer.toneMappingExposure=J?0.9:1.1}buildGround(){let J=new PJ(new Z6(1000,1000),R0(n.grass,{roughness:1,map:tY()}));J.rotation.x=-Math.PI/2,J.receiveShadow=!0,this.scene.add(J)}plinth(J,$,Q,Z,W){let Y=this.box(Q,0.6,Z,n.concrete,J+Q/2,0,$+Z/2,{map:Y6(),roughness:0.9});this.scenery.add(Y);let K=new PJ(new T0(Q+1.4,0.4,Z+1.4),R0(n.kerb,{roughness:0.85}));K.position.set(J+Q/2,0.2,$+Z/2),K.receiveShadow=!0,this.scenery.add(K);let X=K6(W,{w:Math.min(Q-6,56),h:6.5,font:3.6,color:"#eef2f6",bg:"#4f5964",mono:!0});X.rotation.x=-Math.PI/2,X.rotation.z=Math.PI/4,X.position.set(J+Q/2,0.62,$+Z-9),this.scenery.add(X)}clearTown(){for(let J of this.flows)this.scene.remove(J.ring);this.world.clear(),this.scenery.clear(),this.fx.clear(),this.pickables=[],this.flows=[],this.fills=[],this.tankFills.clear(),this.tankPanels.clear(),this.leaks=[],this.beacons=[],this.steams=[],this.spins=[],this.halos=[],this.digs=[],this.vans.clear(),this.trips=[],this.puffs=[],this.tankPos.clear(),this.labelAnchors=[],this.hovered=null}tag(J,$){J.userData=$,this.pickables.push(J)}box(J,$,Q,Z,W,Y,K,X={}){let G=new PJ(new T0(J,$,Q),R0(Z,X));return G.position.set(W,Y+$/2,K),G.castShadow=!0,G.receiveShadow=!0,G}cyl(J,$,Q,Z,W,Y,K={},X=!1){let G=new PJ(new B0(J,J,$,40),X?Y7(Q):R0(Q,K));return G.position.set(Z,W+$/2,Y),G.castShadow=!0,G.receiveShadow=!0,G}ring(J,$,Q,Z,W,Y,K=!1){let X=new PJ(new g0(J,$,10,48),R0(Q,{roughness:0.45,metalness:0.7}));if(!K)X.rotation.x=Math.PI/2;else X.rotation.y=Math.PI/2;return X.position.set(Z,W,Y),X.castShadow=!0,X}disc(J,$,Q,Z,W,Y={}){let K=new PJ(new G8(J,48),R0($,Y));return K.rotation.x=-Math.PI/2,K.position.set(Q,W,Z),K.receiveShadow=!0,K}pipe(J,$,Q=!0){let Z=new Q7(J.map((Y)=>new T(...Y)),!1,"catmullrom",0),W=new PJ(new V8(Z,Math.max(8,J.length*24),$,18,!1),p0(n.pipe));W.castShadow=!0,W.receiveShadow=!0,this.world.add(W);for(let Y of J){let K=new PJ(new B0($+0.32,$+0.32,0.55,20),R0(n.flange,{metalness:0.7,roughness:0.4}));K.position.set(Y[0],Y[1],Y[2]);let X=J[Math.min(J.length-1,J.indexOf(Y)+1)],G=X[0]-Y[0],U=X[2]-Y[2];K.rotation.z=Math.abs(G)>=Math.abs(U)?Math.PI/2:0,K.rotation.x=Math.abs(G)>=Math.abs(U)?0:Math.PI/2,K.castShadow=!0,this.world.add(K)}if(Q){let Y=Z.getLength(),K=Math.max(1,Math.floor(Y/12));for(let X=1;X<=K;X++){let G=Z.getPoint(X/(K+1));this.world.add(this.box(1.4,G.y-$,1.4,n.concreteDark,G.x,0.6,G.z,{map:Y6()}))}}return Z}valveOnPipe(J,$,Q,Z){let W=new Z0;W.position.set(J,$,Q),W.add(this.cyl(Z+0.5,1.6,n.pipeDark,0,-0.8,0,{metalness:0.6,roughness:0.4}).rotateZ(Math.PI/2)),W.add(this.cyl(0.32,1.6,n.steelDark,0,Z-0.2,0,{},!0));let Y=new PJ(new g0(0.9,0.12,8,24),p0(n.red));Y.rotation.x=Math.PI/2,Y.position.y=Z+1.5,W.add(Y),this.world.add(W)}valve(J,$,Q,Z){let W=new Z0;W.position.set(J,$,Q),W.add(this.cyl(0.9,1.6,n.pipeDark,0,-0.8,0,{metalness:0.6,roughness:0.4}).rotateZ(Math.PI/2)),W.add(this.cyl(0.28,1.4,n.steelDark,0,0.5,0,{},!0));let Y=new PJ(new g0(0.8,0.11,8,24),p0(Z?n.red:n.steel));if(Y.rotation.x=Z?0:Math.PI/2,Y.position.y=1.9,W.add(Y),Z){let K=K6("CLOSED",{w:2.2,h:0.7,font:0.4,color:"#ffd6d0",bg:"#7a2a22"});K.position.set(0,3.1,0),K.rotation.y=Math.PI/4,W.add(K)}return W}gauge(J,$,Q,Z){let W=new Z0;W.position.set(J,$,Q);let Y=new PJ(new B0(0.75,0.75,0.25,24),R0(15264750,{roughness:0.3}));Y.rotation.x=Math.PI/2,W.add(Y),W.add(this.ring(0.78,0.08,n.steelDark,0,0,0,!1).rotateX(0));let K=new PJ(new g0(0.55,0.07,6,20,Math.PI*0.6),B6(Z==="grey"?n.grey:D8[Z],1.2));K.position.z=0.14,K.rotation.z=Z==="red"?-0.4:Z==="amber"?0.4:1.6,W.add(K);let X=this.box(0.08,0.6,0.06,2106408,0,0,0.16);return X.rotation.z=Z==="red"?-1.2:Z==="amber"?-0.3:Z==="green"?0.8:1.4,W.add(X),W}light(J,$,Q,Z,W){let Y=new Z0;Y.position.set(J,$,Q),Y.add(this.cyl(0.32,0.4,n.gunmetal,0,0,0));let K=new PJ(new W6(0.34,14,10),W?B6(Z,2.4):R0(Z,{roughness:0.3}));if(K.position.y=0.55,Y.add(K),W){let X=K7(k9(),Z,0.55,!0);X.scale.set(2.4,2.4,1),X.position.y=0.55,Y.add(X)}return Y}makeVan(J,$,Q){let Z=new Z0;Z.add(this.box(3.4,2.7,6.4,J,0,0.55,-0.6,{roughness:0.3,metalness:0.35})),Z.add(this.box(3.4,2.1,2.4,J,0,0.55,3.8,{roughness:0.3,metalness:0.35})),Z.add(this.box(3.2,1,0.2,2042422,0,1.75,5.05,{roughness:0.05,metalness:0.6})),Z.add(this.box(0.2,0.8,5.6,2042422,1.71,1.9,-0.6,{roughness:0.05,metalness:0.6})),Z.add(this.box(3.42,0.35,6.42,n.vanTrim,0,1.55,-0.6));for(let Y of[1,-1]){let K=K6(Q.toUpperCase(),{w:3.2,h:0.9,font:0.5,color:"#eef2f6",bg:"#22406a"});K.position.set(Y*1.72,1.2,-0.6),K.rotation.y=Y*Math.PI/2,Z.add(K)}Z.add(this.box(3,0.15,5,n.steelDark,0,3.25,-0.4));for(let Y=0;Y<4;Y++)Z.add(this.box(3,0.1,0.15,n.steel,0,3.4,-2.6+Y*1.5));let W=B6(16773583,$?2.5:0.1);for(let Y of[1,-1]){let K=new PJ(new T0(0.7,0.35,0.15),W);K.position.set(Y*1.1,1.3,5.05),Z.add(K)}for(let[Y,K]of[[-1.7,2.3],[1.7,2.3],[-1.7,-2.3],[1.7,-2.3]]){let X=new PJ(new B0(0.7,0.7,0.5,20),R0(n.tyre,{roughness:0.9}));X.rotation.z=Math.PI/2,X.position.set(Y,0.7,K),X.castShadow=!0,Z.add(X);let G=new PJ(new B0(0.35,0.35,0.52,12),Y7());G.rotation.z=Math.PI/2,G.position.set(Y,0.7,K),Z.add(G)}return Z}lightPole(J,$){this.scenery.add(this.cyl(0.2,10,n.gunmetal,J,0,$)),this.scenery.add(this.box(2.4,0.2,0.3,n.gunmetal,J+1.1,9.8,$));let Q=new PJ(new T0(1.4,0.25,0.5),B6(16771524,1.4));Q.position.set(J+2.2,9.7,$),this.scenery.add(Q)}tree(J,$){let Q=new Z0;Q.position.set(J,0,$),Q.add(this.cyl(0.35,2,7032631,0,0,0));let Z=new PJ(new W6(2.6,14,12),R0(5208645,{roughness:1}));Z.position.y=4,Z.castShadow=!0,Q.add(Z);let W=new PJ(new W6(1.9,14,12),R0(4483900,{roughness:1}));W.position.set(1.3,5.2,0.7),W.castShadow=!0,Q.add(W),this.scenery.add(Q)}shippingContainer(J,$,Q){this.scenery.add(this.box(12,2.6,2.6,Q,J,0.6,$,{roughness:0.55,metalness:0.4,map:N8()}))}paintTankPanel(J,$,Q){let Z=this.tankPanels.get(J);if(!Z)return;Z.clear();let W=Q>0?Math.round(Math.min(1,$/Q)*100):0;Z.add(K6(`${$} / ${Q}
${W}% FULL`,{w:6,h:3,font:1,mono:!0,color:W>=100?"#ffc48a":"#8fdcff"})),Z.add(this.box(6.4,3.4,0.3,n.gunmetal,0,-1.7,-0.2)),Z.add(this.box(0.3,3,0.3,n.gunmetal,0,-4.7,-0.2))}addFlow(J,$,Q,Z){let W=new PJ(new g0(Z+0.12,0.16,8,28),new M6({color:n.waterGlow,transparent:!0,opacity:0.9,toneMapped:!1}));this.scene.add(W),this.flows.push({ring:W,curve:J,t:$,speed:Q})}addLeak(J,$){let Q=this.disc(0.5,n.water,J.x+$.x*2,J.z+$.z*2,0.64,{transparent:!0,opacity:0.55,roughness:0.05,metalness:0.5});this.fx.add(Q),this.leaks.push({at:J,dir:$.clone().normalize(),drops:[],next:0,puddle:Q})}addBeacon(J,$){let Q=new Z0;Q.position.copy(J),Q.add(this.cyl(0.4,0.5,n.gunmetal,0,0,0));let Z=new PJ(new W6(0.45,14,10),B6($,2.5));Z.position.y=0.7,Q.add(Z);let W=K7(k9(),$,0.8,!0);W.scale.set(5,5,1),W.position.y=0.7,Q.add(W),this.fx.add(Q),this.beacons.push({dome:Z,glow:W,phase:Math.random()*6,color:$})}addSteam(J){this.steams.push({at:J,puffs:[],next:0})}addHalo(J,$){let Q=new PJ(new H8($-0.3,$,64),new M6({color:n.green,transparent:!0,opacity:0.55,side:f5,toneMapped:!1}));Q.rotation.x=-Math.PI/2,Q.position.copy(J),this.fx.add(Q),this.halos.push({ring:Q,phase:Math.random()*6})}fitCamera(){let J=new O6().setFromObject(this.world);if(J.isEmpty())return;this.center=J.getCenter(new T),this.center.y=0,this.camera.position.copy(this.center).add(R8),this.camera.lookAt(this.center),this.camera.updateMatrixWorld();let $=this.camera.matrixWorldInverse,Q=this.container.clientWidth||1440,Z=this.container.clientHeight||900,W=Q>1000?Math.round(Q*0.21)+12:0,Y=74,K=Q/Z,X=Math.max(1,(Q-W)/(Z-Y)),G=1,U=[J.min,J.max];for(let D of[0,1])for(let A of[0,1])for(let O of[0,1]){let F=new T(U[D].x,U[A].y,U[O].z).applyMatrix4($);G=Math.max(G,Math.abs(F.x)/X,Math.abs(F.y))}this.baseFs=G*1*(Z/(Z-Y));let V=2*this.baseFs*K/Q,H=new T(1,0,-1).normalize(),q=new T(-1,0,-1).normalize();this.center.add(H.multiplyScalar(W/2*V)).add(q.multiplyScalar(Y/2*V*1.3)),this.camera.position.copy(this.center).add(R8),this.camera.lookAt(this.center),this.resize()}resize=()=>{let J=this.container.clientWidth||1,$=this.container.clientHeight||1;this.renderer.setSize(J,$,!1);let Q=this.baseFs*this.zoom,Z=J/$;this.camera.left=-Q*Z,this.camera.right=Q*Z,this.camera.top=Q,this.camera.bottom=-Q,this.camera.updateProjectionMatrix()};onMove=(J)=>{let $=this.renderer.domElement.getBoundingClientRect();this.pointer.set((J.clientX-$.left)/$.width*2-1,-((J.clientY-$.top)/$.height)*2+1)};onClick=()=>{let J=this.pickAt();this.opts.onPick?.(J?J.userData:null)};pickAt(){this.raycaster.setFromCamera(this.pointer,this.camera);let J=this.raycaster.intersectObjects(this.pickables,!0);if(!J.length)return null;let $=J[0].object;while($&&!($.userData&&$.userData.kind))$=$.parent;return $}loop=()=>{if(this.disposed)return;this.raf=requestAnimationFrame(this.loop);let J=Math.min(0.05,this.clock.getDelta()),$=this.clock.elapsedTime;if(Math.abs(this.zoom-this.zoomTarget)>0.002)this.zoom+=(this.zoomTarget-this.zoom)*0.08,this.resize();for(let Z of this.flows){Z.t=(Z.t+Z.speed*J)%1;let W=Z.curve.getPoint(Z.t),Y=Z.curve.getPoint(Math.min(1,Z.t+0.01));Z.ring.position.copy(W),Z.ring.lookAt(Y)}for(let Z of this.fills){let W=Z.water.scale.y*0.01,Y=W+(Z.target*Z.maxH-W)*Math.min(1,J*1.6);Z.water.scale.y=Math.max(0.01,Y)/0.01,Z.water.position.y=Z.base+Y/2}for(let Z of this.spins)Z.mesh.rotation.z+=J*Z.speed;for(let Z of this.beacons){let W=(Math.sin($*6+Z.phase)+1)/2;Z.glow.material.opacity=0.15+0.75*W,Z.glow.scale.setScalar(3.5+3*W),Z.dome.material.emissiveIntensity=0.6+2.4*W}for(let Z of this.halos)Z.ring.material.opacity=0.35+0.3*Math.sin($*1.6+Z.phase),Z.ring.rotation.z=$*0.25;for(let Z of this.leaks){if(Z.next-=J,Z.next<=0){Z.next=0.07;let Y=K7(QK(),16777215,0.9);Y.scale.set(0.5,0.5,1),Y.position.copy(Z.at),this.fx.add(Y),Z.drops.push({s:Y,v:Z.dir.clone().multiplyScalar(6).add(new T((Math.random()-0.5)*2,Math.random()*2,(Math.random()-0.5)*2)),life:1})}for(let Y of[...Z.drops])if(Y.life-=J*1.4,Y.v.y-=16*J,Y.s.position.addScaledVector(Y.v,J),Y.s.position.y<0.7||Y.life<=0)this.fx.remove(Y.s),Z.drops=Z.drops.filter((K)=>K!==Y);let W=Math.min(3.2,Z.puddle.scale.x+J*0.25);Z.puddle.scale.set(W,W,1)}for(let Z of this.steams){if(Z.next-=J,Z.next<=0){Z.next=0.12;let W=K7(S$(),16777215,0.6);W.scale.set(1.2,1.2,1),W.position.copy(Z.at),this.fx.add(W),Z.puffs.push({s:W,life:1})}for(let W of[...Z.puffs])if(W.life-=J*0.7,W.s.position.y+=J*4,W.s.position.x+=J*0.6,W.s.scale.addScalar(J*2.5),W.s.material.opacity=0.6*Math.max(0,W.life),W.life<=0)this.fx.remove(W.s),Z.puffs=Z.puffs.filter((Y)=>Y!==W)}for(let Z of this.digs){if(Z.boom.rotation.x=-0.35+Math.sin($*1.4)*0.3,Z.bucket.rotation.x=0.6+Math.sin($*1.4+1)*0.5,Z.next-=J,Z.next<=0){Z.next=0.6+Math.random()*0.5;let W=new PJ(new U8(0.32),R0(n.dirt,{roughness:1}));W.position.set(Z.site.x-1,2,Z.site.z),this.fx.add(W),Z.clods.push({mesh:W,v:new T(4+Math.random()*2,4+Math.random()*2,(Math.random()-0.5)*2),life:1.2})}for(let W of[...Z.clods])if(W.life-=J,W.v.y-=14*J,W.mesh.position.addScaledVector(W.v,J),W.life<=0||W.mesh.position.y<0.6)this.fx.remove(W.mesh),Z.clods=Z.clods.filter((Y)=>Y!==W)}for(let Z of[...this.trips])this.stepTrip(Z,J);for(let Z of[...this.puffs])if(Z.life-=J*0.9,Z.s.position.y+=J*1.2,Z.s.scale.addScalar(J*1.2),Z.s.material.opacity=0.5*Math.max(0,Z.life),Z.life<=0)this.fx.remove(Z.s),this.puffs=this.puffs.filter((W)=>W!==Z);let Q=this.pickAt();if(Q!==this.hovered)this.hovered=Q,this.renderer.domElement.style.cursor=Q?"pointer":"default";if(this.renderer.render(this.scene,this.camera),this.opts.onLabels){let Z=this.container.clientWidth,W=this.container.clientHeight,Y=this.hovered?.userData,K=Y?Y.kind==="depot"||Y.kind==="meter"?Y.kind:`${Y.kind}:${Y.id}`:null;this.opts.onLabels(this.labelAnchors.map((X)=>{let G=X.pos.clone().project(this.camera);return{key:X.key,x:(G.x+1)/2*Z,y:(1-G.y)/2*W,short:X.short,title:X.title,kpis:X.kpis,tone:X.tone,hidden:G.z>1,active:X.key===K,kind:X.kind}}))}};stepTrip(J,$){let Q=J.van.group;if(J.phase==="drop"){J.dropT+=$;let Y=this.tankPos.get(J.clinicId);if(J.crate&&Y){let K=Math.min(1,J.dropT/1.1);if(J.crate.position.lerpVectors(new T(Q.position.x,3,Q.position.z),new T(Y.x,9.6,Y.z-6),K),J.crate.position.y+=Math.sin(K*Math.PI)*7,J.crate.rotation.y+=$*5,K>=1){this.fx.remove(J.crate),J.crate=null;let X=K7(k9(),n.waterGlow,0.9,!0);X.scale.set(4,4,1),X.position.set(Y.x,9.4,Y.z-6),this.fx.add(X),this.puffs.push({s:X,life:1})}}if(J.dropT>2){J.phase="back";let K=J.van.home;J.curve=new Q7([Q.position.clone(),new T(this.clinicRoadX,0.6,Q.position.z),new T(this.clinicRoadX,0.6,this.roadZ),new T(K.x,0.6,this.roadZ),K.clone()],!1,"catmullrom",0.05),J.t=0,J.speed=0.15}return}if(J.t+=$*J.speed,J.puffT-=$,J.puffT<=0){J.puffT=0.15;let Y=K7(S$(),14212578,0.5);Y.scale.set(1.4,1.4,1),Y.position.set(Q.position.x,1.4,Q.position.z),this.fx.add(Y),this.puffs.push({s:Y,life:1})}if(J.t>=1){if(J.phase==="out"){J.phase="drop",J.dropT=0;let Y=this.box(1.5,1.5,1.5,n.navy,Q.position.x,3,Q.position.z);this.fx.add(Y),J.crate=Y}else Q.position.copy(J.van.home),Q.rotation.y=J.van.rot,J.van.busy=!1,this.trips=this.trips.filter((Y)=>Y!==J);return}let Z=J.curve.getPoint(J.t),W=J.curve.getPoint(Math.min(1,J.t+0.01));Q.position.set(Z.x,0.6,Z.z),Q.rotation.y=Math.atan2(W.x-Z.x,W.z-Z.z)}}function C9(J,$,Q,Z,W,Y){let K=Z-$,X=W-Q,G=Math.hypot(K,X);if(G<1)return;let U=new PJ(new Z6(G,Y),R0(n.asphalt,{roughness:0.95,map:eY()}));U.rotation.x=-Math.PI/2,U.rotation.z=-Math.atan2(X,K),U.position.set(($+Z)/2,0.05,(Q+W)/2),U.receiveShadow=!0,J.add(U);let V=Math.floor(G/6);for(let H=0;H<V;H++){let q=(H+0.5)/V,D=new PJ(new Z6(2.4,0.25),new M6({color:14278114}));D.rotation.x=-Math.PI/2,D.rotation.z=-Math.atan2(X,K),D.position.set($+K*q,0.06,Q+X*q),J.add(D)}}window.__HTG_SCENE__={TownScene:I9};})();
